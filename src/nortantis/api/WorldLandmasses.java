package nortantis.api;

import nortantis.Region;
import nortantis.WorldGraph;
import nortantis.graph.voronoi.Center;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;

/**
 * The separate pieces of land a world is made of: every continent and every island is one landmass, with an id of its own, and every region
 * belongs to the one it stands on.
 *
 * This exists because a list of region names says nothing about which of them a traveller can walk between. Two territories on one
 * continent share a border, a road and a history; two territories on different continents share none of that, and a story that moves
 * between them needs ships. A reader holding only names has to guess that, and guesses "somewhere else on the map" - which is how a
 * campaign ends up marching an army across an ocean.
 *
 * Landmasses are found by joining land cells through their neighbours, and {@link WorldSurroundings} reads the island answer from here, so
 * a place and the region it sits in can never disagree about what they stand on. Ids are handed out largest landmass first, which makes the
 * biggest continent of a world id 1 and keeps the numbering stable for a given graph.
 */
public final class WorldLandmasses
{
	/**
	 * A landmass below this share of the world's land is reported as an island, provided it does not reach the map edge.
	 *
	 * Land that meets the map edge is a cut-off continent rather than an island, whichever way the map was cropped.
	 */
	public static final double ISLAND_LAND_SHARE = 0.1;

	/** The id reported for a point that is not on any landmass, which is what open water and a lake are. */
	public static final int NONE = 0;

	/**
	 * One continent or island: how much land it holds, and whether it is an island rather than part of a continent.
	 */
	public static final class Landmass
	{
		private final int id;
		private final int landCells;
		private final boolean island;

		private Landmass(int id, int landCells, boolean island)
		{
			this.id = id;
			this.landCells = landCells;
			this.island = island;
		}

		public int getId()
		{
			return id;
		}

		public int getLandCells()
		{
			return landCells;
		}

		public boolean isIsland()
		{
			return island;
		}
	}

	private final Map<Center, Integer> idByCenter;
	private final List<Landmass> landmasses;

	private WorldLandmasses(Map<Center, Integer> idByCenter, List<Landmass> landmasses)
	{
		this.idByCenter = idByCenter;
		this.landmasses = landmasses;
	}

	/**
	 * Finds the landmasses of a generated world, or returns null when there is no graph to read them from.
	 *
	 * A null answer is deliberate: without the graph there is no land to divide, and reporting "one continent" would be an invented
	 * geography where the truth is that this world was not described.
	 */
	public static WorldLandmasses forWorld(WorldGraph graph)
	{
		if (graph == null || graph.centers == null || graph.centers.isEmpty())
		{
			return null;
		}

		int landCells = 0;
		for (Center center : graph.centers)
		{
			if (!center.isWater)
			{
				landCells++;
			}
		}

		// Component ids are provisional here; they are numbered by size at the end so the largest continent is always id 1.
		Map<Center, Integer> componentByCenter = new IdentityHashMap<>();
		List<Component> components = new ArrayList<>();

		for (Center start : graph.centers)
		{
			if (start.isWater || componentByCenter.containsKey(start))
			{
				continue;
			}

			int componentIndex = components.size();
			Component component = new Component();
			Deque<Center> frontier = new ArrayDeque<>();
			componentByCenter.put(start, componentIndex);
			frontier.add(start);

			while (!frontier.isEmpty())
			{
				Center center = frontier.poll();
				component.landCells++;
				component.reachesBorder |= center.isBorder;
				for (Center neighbor : center.neighbors)
				{
					if (!neighbor.isWater && !componentByCenter.containsKey(neighbor))
					{
						componentByCenter.put(neighbor, componentIndex);
						frontier.add(neighbor);
					}
				}
			}
			components.add(component);
		}

		int islandCellLimit = Math.max(1, (int) Math.round(landCells * ISLAND_LAND_SHARE));

		// Largest first, so a reader can tell the continent from the isles by the numbers alone. The sort is stable, and the graph's
		// centers are in a fixed order, so two runs over the same graph number the same landmasses the same way.
		List<Integer> bySize = new ArrayList<>(components.size());
		for (int i = 0; i < components.size(); i++)
		{
			bySize.add(i);
		}
		bySize.sort(Comparator.comparingInt((Integer index) -> components.get(index).landCells).reversed());

		int[] idByComponent = new int[components.size()];
		List<Landmass> landmasses = new ArrayList<>(components.size());
		for (int position = 0; position < bySize.size(); position++)
		{
			int componentIndex = bySize.get(position);
			Component component = components.get(componentIndex);
			int id = position + 1;
			idByComponent[componentIndex] = id;
			boolean island = component.landCells <= islandCellLimit && !component.reachesBorder;
			landmasses.add(new Landmass(id, component.landCells, island));
		}

		Map<Center, Integer> idByCenter = new IdentityHashMap<>(componentByCenter.size());
		for (Map.Entry<Center, Integer> entry : componentByCenter.entrySet())
		{
			idByCenter.put(entry.getKey(), idByComponent[entry.getValue()]);
		}

		return new WorldLandmasses(idByCenter, Collections.unmodifiableList(landmasses));
	}

	/** Every landmass in the world, largest first. */
	public List<Landmass> landmasses()
	{
		return landmasses;
	}

	/** The landmass a point stands on, or {@link #NONE} when it stands on water. */
	public int idOf(Center center)
	{
		if (center == null || center.isWater)
		{
			return NONE;
		}
		Integer id = idByCenter.get(center);
		return id == null ? NONE : id;
	}

	/**
	 * Whether the land at a point is an island rather than part of a continent.
	 *
	 * False for water, which is not land whose size can be judged.
	 */
	public boolean isIsland(Center center)
	{
		int id = idOf(center);
		if (id == NONE)
		{
			return false;
		}
		return landmasses.get(id - 1).isIsland();
	}

	/**
	 * The landmass a region mostly sits on, or {@link #NONE} for a region that holds no land.
	 *
	 * A region is grown over land, so in an undivided world every center of it shares one landmass. Reporting the landmass most of its
	 * centers are on is what keeps the answer honest if a region was ever drawn across an isthmus or a narrow strait: the region belongs to
	 * the land the bulk of it is.
	 */
	public int idOfRegion(Region region)
	{
		if (region == null || region.size() == 0)
		{
			return NONE;
		}

		Map<Integer, Integer> counts = new HashMap<>();
		for (Center center : region.getCenters())
		{
			int id = idOf(center);
			if (id != NONE)
			{
				counts.merge(id, 1, Integer::sum);
			}
		}

		int dominant = NONE;
		int dominantCount = 0;
		for (Map.Entry<Integer, Integer> entry : counts.entrySet())
		{
			// Ties go to the lower id, which is the larger landmass, so the answer does not depend on map iteration order.
			if (entry.getValue() > dominantCount || (entry.getValue() == dominantCount && entry.getKey() < dominant))
			{
				dominant = entry.getKey();
				dominantCount = entry.getValue();
			}
		}
		return dominant;
	}

	/** Whether the landmass with this id is an island, or false when no landmass has it. */
	public boolean isIsland(int landmassId)
	{
		if (landmassId <= NONE || landmassId > landmasses.size())
		{
			return false;
		}
		return landmasses.get(landmassId - 1).isIsland();
	}

	/** Working state for one connected piece of land while it is being grown. */
	private static final class Component
	{
		private int landCells;
		private boolean reachesBorder;
	}
}

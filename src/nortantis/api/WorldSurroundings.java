package nortantis.api;

import nortantis.WorldGraph;
import nortantis.graph.voronoi.Center;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Describes the ground around a named place: the terrain it stands in, the terrain that borders it, whether the sea, a lake, a river or
 * mountains are within reach, and whether the land it stands on is an island rather than part of a continent.
 *
 * This exists because the named places a world reports are bare names on a map, and a language model narrating that world cannot tell a
 * fishing village from a mountain fortress without looking at the terrain itself. The answer is read from the same Voronoi graph the map
 * was drawn from, so it is as authoritative as the world description it is attached to, and it is reported per world rather than guessed
 * per turn.
 *
 * Distances are counted in Voronoi cells rather than map units, which keeps the answer meaningful at any world size and render resolution.
 */
public final class WorldSurroundings
{
	/**
	 * How many cells out the surrounding land is sampled. Wide enough to see the terrain a place sits at the edge of, narrow enough to stay
	 * local.
	 */
	public static final int LAND_SAMPLE_DEPTH = 5;

	/**
	 * How many cells out water is sampled. Nearer than the land sample, because "on the coast" or "beside a lake" is a claim about the
	 * place, not its region.
	 */
	public static final int WATER_SAMPLE_DEPTH = 2;

	/**
	 * How many cells out a river still counts as near. A river is a landmark a settlement relates to even when it does not reach it, so it
	 * is sampled wider than the sea and reported apart from the river the place actually stands on.
	 */
	public static final int RIVER_SAMPLE_DEPTH = 2;

	/** A landmass below this share of the world's land is reported as an island, provided it does not reach the map edge. */
	public static final double ISLAND_LAND_SHARE = 0.1;

	private final int islandCellLimit;

	private WorldSurroundings(int islandCellLimit)
	{
		this.islandCellLimit = islandCellLimit;
	}

	/**
	 * Prepares the shared state one world's place descriptions need, or returns null when there is no graph.
	 *
	 * A null answer is deliberate: without the graph there is no ground to describe, and omitting the field tells a caller the truth where
	 * a made-up terrain would not.
	 */
	public static WorldSurroundings forWorld(WorldGraph graph)
	{
		if (graph == null || graph.centers.isEmpty())
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
		int islandCellLimit = Math.max(1, (int) Math.round(landCells * ISLAND_LAND_SHARE));
		return new WorldSurroundings(islandCellLimit);
	}

	/**
	 * Describes the surroundings of one named place, in resolution-invariant terms, or returns null when the place has no centre.
	 *
	 * The caller resolves the centre because it is the same centre that says which region the place is in, and asking twice would risk two
	 * answers for one point.
	 *
	 * The returned map carries {@code terrain} and, only when it differs, {@code nearbyTerrain}; the booleans {@code coastal},
	 * {@code lake}, {@code seaNearby}, {@code lakeNearby}, {@code river}, {@code riverNearby}, {@code mountains} and {@code island}.
	 * {@code coastal} and {@code lake} are about this place's own cell - it sits on that water - while {@code seaNearby} and
	 * {@code lakeNearby} mean the water is a few cells away without reaching the place. {@code river} means a river runs along this place's
	 * own edge; {@code riverNearby} means one is close but does not reach it. A caller renders those fields into prose; it never has to
	 * interpret the graph itself.
	 */
	public Map<String, Object> describe(Center place)
	{
		if (place == null)
		{
			return null;
		}

		TerrainType terrainAtPlace = TerrainType.classify(place);

		Map<TerrainType, Integer> landNearby = new EnumMap<>(TerrainType.class);
		boolean mountains = false;
		for (Center center : nearbyCenters(place, LAND_SAMPLE_DEPTH))
		{
			TerrainType terrain = TerrainType.classify(center);
			if (!terrain.water)
			{
				landNearby.merge(terrain, 1, Integer::sum);
			}
			mountains |= terrain == TerrainType.MOUNTAIN;
		}

		boolean seaNearby = false;
		boolean lakeNearby = false;
		for (Center center : nearbyCenters(place, WATER_SAMPLE_DEPTH))
		{
			TerrainType terrain = TerrainType.classify(center);
			seaNearby |= terrain == TerrainType.OCEAN;
			lakeNearby |= terrain == TerrainType.LAKE;
		}

		// "On the coast" is a claim about this very cell: it is land that shares an edge with the sea. Water a few cells away is a
		// different and much weaker fact - a place a mile inland has the sea "nearby" and no shore - so it is reported apart from the
		// coast rather than as it. A caller asking whether there is a beach at a point needs the strict answer, and it has to be the same
		// answer the extent search gives for the same question.
		boolean coastal = TerrainType.isCoastal(place);
		boolean lake = TerrainType.isLakeside(place);

		TerrainType nearbyTerrain = TerrainType.dominant(landNearby);
		boolean riverAtPlace = place.isRiver();

		Map<String, Object> surroundings = new LinkedHashMap<>();
		surroundings.put("terrain", terrainAtPlace.label);
		if (nearbyTerrain != null && nearbyTerrain != terrainAtPlace)
		{
			surroundings.put("nearbyTerrain", nearbyTerrain.label);
		}
		surroundings.put("coastal", coastal);
		surroundings.put("lake", lake);
		surroundings.put("seaNearby", !terrainAtPlace.water && seaNearby && !coastal);
		surroundings.put("lakeNearby", !terrainAtPlace.water && lakeNearby && !lake);
		surroundings.put("river", riverAtPlace);
		surroundings.put("riverNearby", !riverAtPlace && hasRiverWithin(place, RIVER_SAMPLE_DEPTH));
		surroundings.put("mountains", mountains);
		surroundings.put("island", isIsland(place));
		return surroundings;
	}

	/**
	 * The centres within {@code depth} hops of a place, nearest first. Breadth-first over neighbour links is what makes the radius
	 * scale-free: cells are never further apart than their neighbours, so a hop count means the same on a small island and on a continent.
	 */
	private static List<Center> nearbyCenters(Center start, int depth)
	{
		List<Center> area = new ArrayList<>();
		Set<Center> seen = new HashSet<>();
		List<Center> frontier = new ArrayList<>();

		area.add(start);
		seen.add(start);
		frontier.add(start);

		for (int level = 0; level < depth && !frontier.isEmpty(); level++)
		{
			List<Center> next = new ArrayList<>();
			for (Center center : frontier)
			{
				for (Center neighbor : center.neighbors)
				{
					if (seen.add(neighbor))
					{
						next.add(neighbor);
					}
				}
			}
			area.addAll(next);
			frontier = next;
		}
		return area;
	}

	/**
	 * Whether a river runs along an edge of some centre within {@code depth} hops of the place, the place itself excluded.
	 *
	 * Rivers run along cell edges, so a centre reports one only when one of its own edges carries it. Whether the place itself stands on a
	 * river is a separate answer ({@link Center#isRiver()}); this test is what turns "a river crosses the next cell over" into "a river is
	 * near" without claiming the settlement reaches it.
	 */
	private static boolean hasRiverWithin(Center start, int depth)
	{
		for (Center center : nearbyCenters(start, depth))
		{
			if (center != start && center.isRiver())
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether the land the place stands on is an island: a landmass that stops growing before it covers {@link #ISLAND_LAND_SHARE} of the
	 * world's land and never reaches the map edge.
	 *
	 * Land that meets the map edge is a cut-off continent rather than an island, and land that grows past the cell limit is simply too
	 * large to call one, which is why the search abandons it as soon as the limit is passed instead of walking a whole continent.
	 */
	private boolean isIsland(Center start)
	{
		if (start.isWater)
		{
			return false;
		}

		Set<Center> seen = new HashSet<>();
		Deque<Center> frontier = new ArrayDeque<>();
		seen.add(start);
		frontier.add(start);

		int landCells = 0;
		while (!frontier.isEmpty())
		{
			Center center = frontier.poll();
			landCells++;
			if (landCells > islandCellLimit || center.isBorder)
			{
				return false;
			}
			for (Center neighbor : center.neighbors)
			{
				if (!neighbor.isWater && seen.add(neighbor))
				{
					frontier.add(neighbor);
				}
			}
		}
		return true;
	}
}

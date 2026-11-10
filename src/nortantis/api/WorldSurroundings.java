package nortantis.api;

import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.WorldGraph;
import nortantis.geom.Point;
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

	/** A landmass below this share of the world's land is reported as an island, provided it does not reach the map edge. */
	public static final double ISLAND_LAND_SHARE = 0.1;

	private final WorldGraph graph;
	private final int islandCellLimit;

	private WorldSurroundings(WorldGraph graph, int islandCellLimit)
	{
		this.graph = graph;
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
		return new WorldSurroundings(graph, islandCellLimit);
	}

	/**
	 * Describes the surroundings of one named place, in resolution-invariant terms, or returns null when the place cannot be located on the
	 * graph.
	 *
	 * The returned map carries {@code terrain} and, only when it differs, {@code nearbyTerrain}; the booleans {@code coastal},
	 * {@code lake}, {@code river}, {@code mountains} and {@code island}. A caller renders those fields into prose; it never has to
	 * interpret the graph itself.
	 */
	public Map<String, Object> describe(MapSettings settings, MapText text)
	{
		if (settings == null || text == null || text.location == null)
		{
			return null;
		}

		Point graphPoint = new Point(text.location.x * settings.resolution, text.location.y * settings.resolution);
		Center place = graph.findClosestCenter(graphPoint, false);
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

		boolean coastal = false;
		boolean lake = false;
		for (Center center : nearbyCenters(place, WATER_SAMPLE_DEPTH))
		{
			TerrainType terrain = TerrainType.classify(center);
			coastal |= terrain == TerrainType.OCEAN;
			lake |= terrain == TerrainType.LAKE;
		}

		TerrainType nearbyTerrain = TerrainType.dominant(landNearby);

		Map<String, Object> surroundings = new LinkedHashMap<>();
		surroundings.put("terrain", terrainAtPlace.label);
		if (nearbyTerrain != null && nearbyTerrain != terrainAtPlace)
		{
			surroundings.put("nearbyTerrain", nearbyTerrain.label);
		}
		surroundings.put("coastal", coastal);
		surroundings.put("lake", lake);
		surroundings.put("river", hasRiver(place));
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
	 * Whether the place stands beside a river. Rivers run along cell edges, so a centre reports one when it borders a river itself or
	 * shares an edge with a centre that does; the two-hop test is what turns "a river crosses this cell's neighbour" into "this place is on
	 * the river".
	 */
	private static boolean hasRiver(Center center)
	{
		if (center.isRiver())
		{
			return true;
		}
		for (Center neighbor : center.neighbors)
		{
			if (neighbor.isRiver())
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

package nortantis.api;

import nortantis.graph.voronoi.Center;

import java.util.Locale;
import java.util.Map;

/**
 * The terrain categories a generated world's Voronoi cells fall into, shared by every API answer that has to say what the ground is like.
 *
 * The label is what API responses report, so it is the one word a language model reads; the code is the single character a coarse raster of
 * the world is drawn with; the cost is how much slower travel is over this ground than over open plains; and water is marked so a caller
 * can refuse to cross it.
 */
public enum TerrainType
{
	OCEAN("ocean", '.', 0.0, true), LAKE("lake", '~', 0.0, true), MOUNTAIN("mountain", 'n', 3.0, false), HILLS("hills", 'h', 1.7, false), MARSH("marsh", 'm', 2.2, false), FOREST(
			"forest", 'f', 1.4, false
	), DESERT("desert", 'd', 1.3, false), ARCTIC("arctic", 'a', 1.8, false), PLAINS("plains", 'p', 1.0, false);

	public final String label;
	public final char code;
	public final double cost;
	public final boolean water;

	TerrainType(String label, char code, double cost, boolean water)
	{
		this.label = label;
		this.code = code;
		this.cost = cost;
		this.water = water;
	}

	/**
	 * Classifies one graph centre into the terrain a traveller walking through it would find.
	 *
	 * Water is reported before anything else, because a lake centre can carry a biome and a coast centre can carry hill flags, and neither
	 * changes the fact that it is water.
	 */
	public static TerrainType classify(Center center)
	{
		if (center.isWater)
		{
			return center.isLake ? TerrainType.LAKE : TerrainType.OCEAN;
		}
		if (center.isMountain)
		{
			return TerrainType.MOUNTAIN;
		}
		if (center.isHill)
		{
			return TerrainType.HILLS;
		}
		if (center.biome == null)
		{
			return TerrainType.PLAINS;
		}

		switch (center.biome)
		{
			case MARSH:
				return TerrainType.MARSH;
			case TAIGA:
			case TEMPERATE_RAIN_FOREST:
			case TEMPERATE_DECIDUOUS_FOREST:
			case HIGH_TEMPERATE_DECIDUOUS_FOREST:
			case TROPICAL_RAIN_FOREST:
			case TROPICAL_SEASONAL_FOREST:
				return TerrainType.FOREST;
			case TEMPERATE_DESERT:
			case HIGH_TEMPERATE_DESERT:
			case SUBTROPICAL_DESERT:
			case SCORCHED:
			case BARE:
				return TerrainType.DESERT;
			case SNOW:
			case ICE:
			case TUNDRA:
				return TerrainType.ARCTIC;
			default:
				return TerrainType.PLAINS;
		}
	}

	/**
	 * The terrain a caller named, or null when the name is not one of the categories a world reports.
	 *
	 * Matching is case-insensitive and ignores surrounding space, so a request that copies a label out of a previous answer always
	 * resolves.
	 */
	public static TerrainType fromLabel(String label)
	{
		if (label == null)
		{
			return null;
		}
		String wanted = label.trim().toLowerCase(Locale.ROOT);
		for (TerrainType type : values())
		{
			if (type.label.equals(wanted))
			{
				return type;
			}
		}
		return null;
	}

	/**
	 * Whether a land cell is on the coast: it shares an edge with the sea.
	 *
	 * A lake shore is deliberately not a coast. Water comes in two kinds because a settlement on the sea trades by ship while one on a lake
	 * does not, and reporting one as the other is the kind of mistake that puts a harbour where a lake is.
	 */
	public static boolean isCoastal(Center center)
	{
		if (center == null || center.isWater)
		{
			return false;
		}
		for (Center neighbor : center.neighbors)
		{
			if (neighbor != null && neighbor.isWater && !neighbor.isLake)
			{
				return true;
			}
		}
		return false;
	}

	/** Whether a land cell shares an edge with a lake. */
	public static boolean isLakeside(Center center)
	{
		if (center == null || center.isWater)
		{
			return false;
		}
		for (Center neighbor : center.neighbors)
		{
			if (neighbor != null && neighbor.isLake)
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * The most common terrain among counted cells, or null when nothing was counted.
	 *
	 * Ties keep the lower-valued constant, so the same world always reports the same answer.
	 */
	public static TerrainType dominant(Map<TerrainType, Integer> counts)
	{
		TerrainType best = null;
		int bestCount = 0;
		for (Map.Entry<TerrainType, Integer> entry : counts.entrySet())
		{
			if (entry.getValue() > bestCount)
			{
				best = entry.getKey();
				bestCount = entry.getValue();
			}
		}
		return best;
	}
}

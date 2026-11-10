package nortantis.api;

import nortantis.graph.voronoi.Center;

import java.util.Map;

/**
 * The terrain categories a generated world's Voronoi cells fall into, shared by every API answer that has to say what the ground is like.
 *
 * The label is what API responses report, so it is the one word a language model reads; the cost is how much slower travel is over this
 * ground than over open plains; and water is marked so a caller can refuse to cross it.
 */
public enum TerrainType
{
	OCEAN("ocean", 0.0, true), LAKE("lake", 0.0, true), MOUNTAIN("mountain", 3.0, false), HILLS("hills", 1.7, false), MARSH("marsh", 2.2, false), FOREST("forest", 1.4, false), DESERT(
			"desert", 1.3, false
	), ARCTIC("arctic", 1.8, false), PLAINS("plains", 1.0, false);

	public final String label;
	public final double cost;
	public final boolean water;

	TerrainType(String label, double cost, boolean water)
	{
		this.label = label;
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

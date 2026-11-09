package nortantis;

import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class TectonicPlate
{
	public PlateType type;
	double growthProbability;
	PolarCoordinate velocity;
	public Set<Center> centers;

	// This is needed to give the object a deterministic hash code. If I use the object's address as the hash
	// code, it may change from one run to the next, and so HashSet iterates over the objects in a different
	// order sometimes. The id is assigned by the WorldGraph that owns the plate rather than by a static counter,
	// because a static counter is shared between concurrently generated graphs, which makes ids interleave and
	// therefore makes the plate HashSets iterate in a different order from one concurrent run to the next.
	private final int id;

	public TectonicPlate(double growthProbability, int id)
	{
		this.growthProbability = growthProbability;
		this.id = id;
		centers = new HashSet<>();
	}

	@Override
	public int hashCode()
	{
		return id;
	}

	public Point findCentroid()
	{
		return WorldGraph.findCentroid(centers);
	}

}

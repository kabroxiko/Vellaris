package nortantis.api;

import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.graph.voronoi.Center;
import nortantis.graph.voronoi.Edge;
import nortantis.geom.Point;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Answers "how do I get from here to there, and what is on the way" for a generated world.
 *
 * This is the query side of the API: rather than handing a language model a dump of the map and hoping it recalls the geography, a caller
 * can ask the world itself. Pathfinding runs on the same Voronoi graph the map was drawn from, so routes follow real terrain rather than
 * straight lines, and the terrain along a route is what drives the travel time.
 *
 * All coordinates in requests and responses use the resolution-invariant space that WorldModel reports, so a location means the same thing
 * regardless of the resolution the map was rendered at.
 */
public class RouteModel
{
	/** How much ground a day of travel covers, in resolution-invariant units, before terrain is taken into account. */
	public static final double DEFAULT_MAP_UNITS_PER_DAY = 250.0;

	/** How close a named place has to be to a route to count as being "on the way". */
	public static final double DEFAULT_NEARBY_RADIUS = 40.0;

	/** Default size of an anchor cell, in resolution-invariant units. */
	public static final double DEFAULT_ANCHOR_CELL_SIZE = 50.0;

	private static final int MAX_WAYPOINTS = 40;

	/** How many place names to offer when an endpoint cannot be resolved, so a typo is obvious. */
	private static final int MAX_SUGGESTED_PLACES = 25;

	private RouteModel()
	{
		// Static helpers only.
	}

	/** A place named in the world, or a point in resolution-invariant coordinates. */
	public static class Endpoint
	{
		public String name;
		public Double x;
		public Double y;
	}

	/** The extra fields a route request carries alongside a MapSettings document. */
	public static class RouteRequest
	{
		public Endpoint from;
		public Endpoint to;
		public String mode;
		public Boolean allowWater;
		public Double nearbyRadius;
		public Double mapUnitsPerDay;
		public Double anchorCellSize;
	}

	/** A point given in resolution-invariant coordinates, used for "what is at this spot" questions. */
	public static class PointRequest
	{
		public Double x;
		public Double y;
		public Double anchorCellSize;
	}

	/**
	 * Builds a route between two endpoints.
	 *
	 * Returns a map with {@code success=false} and a message when either endpoint cannot be resolved, and {@code reachable=false} when the
	 * destination exists but cannot be walked to, which is a meaningful answer for a dungeon master rather than an error.
	 */
	public static Map<String, Object> route(MapSettings settings, WorldGraph graph, RouteRequest request)
	{
		double resolution = settings.resolution;
		boolean allowWater = request != null && Boolean.TRUE.equals(request.allowWater);
		double nearbyRadius = positiveOr(request == null ? null : request.nearbyRadius, DEFAULT_NEARBY_RADIUS);
		double mapUnitsPerDay = positiveOr(request == null ? null : request.mapUnitsPerDay, DEFAULT_MAP_UNITS_PER_DAY);
		double anchorCellSize = positiveOr(request == null ? null : request.anchorCellSize, DEFAULT_ANCHOR_CELL_SIZE);
		String mode = request == null || request.mode == null ? "walk" : request.mode.toLowerCase(java.util.Locale.ROOT);

		Resolved from = resolve(graph, settings, request == null ? null : request.from, resolution);
		Resolved to = resolve(graph, settings, request == null ? null : request.to, resolution);

		Map<String, Object> result = new LinkedHashMap<>();
		if (from == null || to == null)
		{
			String unresolved = from == null ? request == null || request.from == null ? "from" : describeEndpoint(request.from) : describeEndpoint(request.to);
			result.put("success", false);
			result.put("message", "Could not resolve the '" + (from == null ? "from" : "to") + "' endpoint: " + unresolved + " is not a place in this world.");
			result.put("availablePlaces", placeNames(settings, MAX_SUGGESTED_PLACES));
			return result;
		}

		result.put("success", true);
		result.put("from", describe(from, anchorCellSize));
		result.put("to", describe(to, anchorCellSize));
		result.put("mode", mode);

		if (from.center.equals(to.center))
		{
			result.put("reachable", true);
			result.put("distance", 0.0);
			result.put("message", "The endpoints resolve to the same location.");
			return result;
		}

		List<Edge> edges = findPath(graph, from.center, to.center, allowWater);
		if (edges == null)
		{
			result.put("reachable", false);
			result.put("message", allowWater ? "No path exists between these locations." : "No land route exists between these locations. They are separated by water.");
			return result;
		}

		List<Center> path = walkPath(from.center, edges);
		List<Point> polyline = toInvariantPolyline(path, resolution);

		double distance = 0;
		double weightedDistance = 0;
		Map<TerrainType, Double> distanceByTerrain = new LinkedHashMap<>();
		boolean crossesWater = false;
		for (int i = 1; i < path.size(); i++)
		{
			Center previous = path.get(i - 1);
			Center currentCenter = path.get(i);
			TerrainType terrain = TerrainType.classify(currentCenter);
			crossesWater |= terrain.water;

			double segment = Center.distanceBetween(previous, currentCenter);
			distance += segment;
			weightedDistance += segment * effectiveCost(terrain, allowWater);
			distanceByTerrain.merge(terrain, segment, Double::sum);
		}

		double invariantDistance = distance / resolution;
		double speedFactor = speedFactorForMode(mode);

		result.put("reachable", true);
		result.put("distance", round(invariantDistance));
		result.put("unit", WorldModel.COORDINATE_SPACE);
		result.put("crossesWater", crossesWater);
		result.put("travel", buildTravel(weightedDistance / resolution, invariantDistance, distanceByTerrain, mapUnitsPerDay, speedFactor, mode, allowWater));
		result.put("regionsCrossed", regionsCrossed(settings, graph, path));
		result.put("placesAlongTheWay", placesAlongTheWay(settings, polyline, nearbyRadius));
		result.put("waypoints", downsampled(settings, path, resolution, anchorCellSize));

		return result;
	}

	/**
	 * Describes a single point: the ground there, the nearest named place, the region containing it, and the anchor to key notes on.
	 *
	 * The ground is what makes this answer worth asking for. A caller standing away from any settlement needs to know what it is standing
	 * on - shore, forest, open water - and the nearest name cannot tell it that.
	 */
	public static Map<String, Object> nearest(MapSettings settings, WorldGraph graph, PointRequest request)
	{
		Map<String, Object> result = new LinkedHashMap<>();
		if (request == null || request.x == null || request.y == null)
		{
			result.put("success", false);
			result.put("message", "Both x and y are required.");
			return result;
		}

		double anchorCellSize = positiveOr(request.anchorCellSize, DEFAULT_ANCHOR_CELL_SIZE);
		Point query = new Point(request.x, request.y);
		double resolution = settings.resolution;

		result.put("success", true);
		result.put("x", round(query.x));
		result.put("y", round(query.y));
		result.put("anchor", anchorFor(query, anchorCellSize));

		MapText closest = closestPlace(settings, query);
		if (closest == null || closest.location == null)
		{
			result.put("place", null);
		}
		else
		{
			Map<String, Object> place = new LinkedHashMap<>();
			place.put("name", closest.value == null ? null : closest.value.trim());
			place.put("type", closest.type == null ? null : closest.type.name());
			place.put("x", round(closest.location.x));
			place.put("y", round(closest.location.y));
			place.put("distance", round(query.distanceTo(closest.location)));
			result.put("place", place);
		}

		if (graph != null)
		{
			Center center = graph.findClosestCenter(new Point(query.x * resolution, query.y * resolution), false);
			result.put("region", describeRegion(settings, graph, center == null ? null : center.region));

			// The ground at the point, in the same terms the world description uses for its places. Without it a caller asking
			// "is there a beach here?" only knows the nearest name, and has to infer the shore from a town that may be hours away.
			WorldSurroundings surroundings = WorldSurroundings.forWorld(graph);
			if (surroundings != null)
			{
				Map<String, Object> ground = surroundings.describe(center);
				if (ground != null)
				{
					result.put("surroundings", ground);
				}
			}
		}

		return result;
	}

	/**
	 * A stable identifier for the area around a point, so a caller can attach its own notes to a spot without the coordinates drifting.
	 *
	 * This is deliberately a coarse cell rather than an exact position: two nearby points of interest should share an anchor, and the
	 * caller keeps its own records keyed by this string. The map server stores nothing.
	 */
	public static String anchorFor(Point resolutionInvariant, double cellSize)
	{
		long cellX = (long) Math.floor(resolutionInvariant.x / cellSize);
		long cellY = (long) Math.floor(resolutionInvariant.y / cellSize);
		return "cell:" + cellX + ":" + cellY;
	}

	private static List<Edge> findPath(WorldGraph graph, Center start, Center end, boolean allowWater)
	{
		return graph.findShortestPath(start, end, (edge, neighbor, distanceToEnd) ->
		{
			TerrainType terrain = TerrainType.classify(neighbor);
			double cost = effectiveCost(terrain, allowWater);
			if (Double.isInfinite(cost))
			{
				// Returning an infinite weight makes the search treat this center as impassable.
				return Double.POSITIVE_INFINITY;
			}
			return Center.distanceBetween(edge.d0, edge.d1) * cost;
		});
	}

	private static double effectiveCost(TerrainType terrain, boolean allowWater)
	{
		if (!terrain.water)
		{
			return terrain.cost;
		}
		// Crossing water is only possible when the caller allows it, and is slow enough that land routes are always preferred.
		return allowWater ? 6.0 : Double.POSITIVE_INFINITY;
	}

	private static double speedFactorForMode(String mode)
	{
		switch (mode)
		{
			case "horse":
				return 1.6;
			case "walk":
				return 1.0;
			default:
				// Unknown modes fall back to walking pace rather than failing, and the assumption is reported to the caller.
				return 1.0;
		}
	}

	/**
	 * Turns the edges A* returned into the sequence of centres actually walked. The edge list is not guaranteed to be in either direction,
	 * so this chains from the start centre and stops when no remaining edge touches the current one.
	 */
	private static List<Center> walkPath(Center start, List<Edge> edges)
	{
		List<Center> path = new ArrayList<>();
		path.add(start);

		List<Edge> remaining = new ArrayList<>(edges);
		Center current = start;
		boolean progressed = true;
		while (!remaining.isEmpty() && progressed)
		{
			progressed = false;
			for (int i = 0; i < remaining.size(); i++)
			{
				Edge edge = remaining.get(i);
				if (!current.equals(edge.d0) && !current.equals(edge.d1))
				{
					continue;
				}

				Center next = current.equals(edge.d0) ? edge.d1 : edge.d0;
				remaining.remove(i);
				progressed = true;
				if (next != null && !next.equals(current))
				{
					path.add(next);
					current = next;
				}
				break;
			}
		}
		return path;
	}

	private static Map<String, Object> buildTravel(double weightedDistance, double flatDistance, Map<TerrainType, Double> distanceByTerrain, double mapUnitsPerDay, double speedFactor, String mode,
			boolean allowWater)
	{
		Map<String, Object> travel = new LinkedHashMap<>();
		double days = weightedDistance / (mapUnitsPerDay * speedFactor);

		travel.put("days", round(days));
		travel.put("terrain", terrainSegments(distanceByTerrain, flatDistance));

		Map<String, Object> assumptions = new LinkedHashMap<>();
		assumptions.put("mode", speedFactor == 1.6 ? "horse" : "walk");
		assumptions.put("requestedMode", mode);
		assumptions.put("mapUnitsPerDay", mapUnitsPerDay);
		assumptions.put("speedFactor", speedFactor);
		assumptions.put("allowWater", allowWater);
		assumptions.put("note", "The map has no inherent physical scale, so days assume mapUnitsPerDay of open ground per day. Override mapUnitsPerDay to match your world's scale.");
		travel.put("assumptions", assumptions);

		return travel;
	}

	private static List<Map<String, Object>> terrainSegments(Map<TerrainType, Double> distanceByTerrain, double totalDistance)
	{
		List<Map<String, Object>> segments = new ArrayList<>();
		List<TerrainType> ordered = new ArrayList<>(distanceByTerrain.keySet());
		ordered.sort((a, b) -> Double.compare(distanceByTerrain.get(b), distanceByTerrain.get(a)));

		for (TerrainType terrain : ordered)
		{
			double segmentDistance = distanceByTerrain.get(terrain);
			Map<String, Object> segment = new LinkedHashMap<>();
			segment.put("terrain", terrain.label);
			segment.put("distance", round(segmentDistance));
			segment.put("share", totalDistance <= 0 ? 0.0 : round(segmentDistance / totalDistance));
			segments.add(segment);
		}
		return segments;
	}

	private static List<Map<String, Object>> regionsCrossed(MapSettings settings, WorldGraph graph, List<Center> path)
	{
		Map<Integer, String> namesByRegionId = WorldModel.attributeRegionNames(settings, graph);
		Map<Integer, Boolean> seen = new LinkedHashMap<>();

		for (Center center : path)
		{
			if (center.region != null)
			{
				seen.putIfAbsent(center.region.id, Boolean.TRUE);
			}
		}

		List<Map<String, Object>> regions = new ArrayList<>();
		for (Integer regionId : seen.keySet())
		{
			Map<String, Object> region = new LinkedHashMap<>();
			region.put("id", regionId);
			region.put("name", namesByRegionId.get(regionId));
			regions.add(region);
		}
		return regions;
	}

	/**
	 * Named places close enough to the route to be worth mentioning, in the order they are reached.
	 */
	private static List<Map<String, Object>> placesAlongTheWay(MapSettings settings, List<Point> polyline, double radius)
	{
		List<Map<String, Object>> nearby = new ArrayList<>();
		if (settings.edits == null || settings.edits.text == null || polyline.isEmpty())
		{
			return nearby;
		}

		for (MapText text : settings.edits.text)
		{
			if (text == null || text.location == null || text.value == null || text.value.trim().isEmpty())
			{
				continue;
			}

			double distanceFromPath = distanceToPolyline(text.location, polyline);
			if (distanceFromPath > radius)
			{
				continue;
			}

			Map<String, Object> place = new LinkedHashMap<>();
			place.put("name", text.value.trim());
			place.put("type", text.type == null ? null : text.type.name());
			place.put("x", round(text.location.x));
			place.put("y", round(text.location.y));
			place.put("distanceFromPath", round(distanceFromPath));
			place.put("distanceAlongPath", round(distanceAlongPolyline(text.location, polyline)));
			nearby.add(place);
		}

		nearby.sort((a, b) -> Double.compare((double) a.get("distanceAlongPath"), (double) b.get("distanceAlongPath")));
		return nearby;
	}

	private static List<Map<String, Object>> downsampled(MapSettings settings, List<Center> path, double resolution, double anchorCellSize)
	{
		List<Map<String, Object>> waypoints = new ArrayList<>();
		int step = Math.max(1, (int) Math.ceil(path.size() / (double) MAX_WAYPOINTS));

		for (int i = 0; i < path.size(); i += step)
		{
			waypoints.add(describeWaypoint(path.get(i), resolution, anchorCellSize));
		}

		Center last = path.get(path.size() - 1);
		Map<String, Object> lastWaypoint = describeWaypoint(last, resolution, anchorCellSize);
		if (waypoints.isEmpty() || !waypoints.get(waypoints.size() - 1).equals(lastWaypoint))
		{
			waypoints.add(lastWaypoint);
		}
		return waypoints;
	}

	private static Map<String, Object> describeWaypoint(Center center, double resolution, double anchorCellSize)
	{
		Map<String, Object> waypoint = new LinkedHashMap<>();
		Point invariant = new Point(center.loc.x / resolution, center.loc.y / resolution);
		waypoint.put("x", round(invariant.x));
		waypoint.put("y", round(invariant.y));
		waypoint.put("terrain", TerrainType.classify(center).label);
		waypoint.put("anchor", anchorFor(invariant, anchorCellSize));
		return waypoint;
	}

	/** A resolved endpoint: the graph centre it snapped to, plus the coordinates and name the caller asked for. */
	static class Resolved
	{
		Center center;
		Point invariant;
		String name;
	}

	static Resolved resolve(WorldGraph graph, MapSettings settings, Endpoint endpoint, double resolution)
	{
		if (graph == null || endpoint == null)
		{
			return null;
		}

		Point invariant = null;
		String name = endpoint.name;
		if (endpoint.x != null && endpoint.y != null)
		{
			invariant = new Point(endpoint.x, endpoint.y);
		}
		else if (endpoint.name != null && !endpoint.name.trim().isEmpty())
		{
			MapText place = findPlace(settings, endpoint.name.trim());
			if (place != null)
			{
				invariant = place.location;
			}
		}

		if (invariant == null)
		{
			return null;
		}

		Center center = graph.findClosestCenter(new Point(invariant.x * resolution, invariant.y * resolution), false);
		if (center == null)
		{
			return null;
		}

		Resolved resolved = new Resolved();
		resolved.center = center;
		resolved.invariant = invariant;
		resolved.name = name;
		return resolved;
	}

	static Map<String, Object> describe(Resolved resolved, double anchorCellSize)
	{
		Map<String, Object> description = new LinkedHashMap<>();
		description.put("name", resolved.name);
		description.put("x", round(resolved.invariant.x));
		description.put("y", round(resolved.invariant.y));
		description.put("anchor", anchorFor(resolved.invariant, anchorCellSize));
		return description;
	}

	static Map<String, Object> describeRegion(MapSettings settings, WorldGraph graph, nortantis.Region region)
	{
		if (region == null)
		{
			return null;
		}

		Map<String, Object> description = new LinkedHashMap<>();
		description.put("id", region.id);
		description.put("name", WorldModel.attributeRegionNames(settings, graph).get(region.id));
		return description;
	}

	/** Describes an endpoint as the caller wrote it, for error messages. */
	private static String describeEndpoint(Endpoint endpoint)
	{
		if (endpoint == null)
		{
			return "the endpoint";
		}
		if (endpoint.name != null && !endpoint.name.trim().isEmpty())
		{
			return "'" + endpoint.name.trim() + "'";
		}
		return "(" + endpoint.x + ", " + endpoint.y + ")";
	}

	/** The place names a caller could have meant, so a failed lookup is self-explanatory. */
	static List<String> placeNames(MapSettings settings, int limit)
	{
		List<String> names = new ArrayList<>();
		if (settings.edits == null || settings.edits.text == null)
		{
			return names;
		}

		for (MapText text : settings.edits.text)
		{
			if (names.size() >= limit)
			{
				break;
			}
			if (text == null || text.location == null || text.value == null || text.value.trim().isEmpty() || text.type == TextType.Title)
			{
				continue;
			}
			names.add(text.value.trim());
		}
		return names;
	}

	private static MapText findPlace(MapSettings settings, String name)
	{
		if (settings.edits == null || settings.edits.text == null)
		{
			return null;
		}

		for (MapText text : settings.edits.text)
		{
			if (text != null && text.location != null && text.value != null && text.value.trim().equalsIgnoreCase(name))
			{
				return text;
			}
		}
		return null;
	}

	static MapText closestPlace(MapSettings settings, Point query)
	{
		if (settings.edits == null || settings.edits.text == null)
		{
			return null;
		}

		MapText closest = null;
		double closestDistance = Double.MAX_VALUE;
		for (MapText text : settings.edits.text)
		{
			if (text == null || text.location == null || text.value == null || text.value.trim().isEmpty())
			{
				continue;
			}
			double distance = query.distanceTo(text.location);
			if (distance < closestDistance)
			{
				closestDistance = distance;
				closest = text;
			}
		}
		return closest;
	}

	private static List<Point> toInvariantPolyline(List<Center> path, double resolution)
	{
		List<Point> polyline = new ArrayList<>(path.size());
		for (Center center : path)
		{
			polyline.add(new Point(center.loc.x / resolution, center.loc.y / resolution));
		}
		return polyline;
	}

	private static double distanceToPolyline(Point point, List<Point> polyline)
	{
		double best = Double.MAX_VALUE;
		for (int i = 1; i < polyline.size(); i++)
		{
			best = Math.min(best, distanceToSegment(point, polyline.get(i - 1), polyline.get(i)));
		}
		return polyline.size() == 1 ? point.distanceTo(polyline.get(0)) : best;
	}

	/** How far along the route the closest point of the polyline is, so places can be ordered by the order they are reached. */
	private static double distanceAlongPolyline(Point point, List<Point> polyline)
	{
		double travelled = 0;
		double bestDistance = Double.MAX_VALUE;
		double best = 0;
		for (int i = 1; i < polyline.size(); i++)
		{
			Point a = polyline.get(i - 1);
			Point b = polyline.get(i);
			double segmentLength = a.distanceTo(b);
			double distance = distanceToSegment(point, a, b);
			if (distance < bestDistance)
			{
				bestDistance = distance;
				best = travelled + segmentLength * projectionFraction(point, a, b);
			}
			travelled += segmentLength;
		}
		return best;
	}

	private static double distanceToSegment(Point point, Point a, Point b)
	{
		double fraction = projectionFraction(point, a, b);
		double x = a.x + (b.x - a.x) * fraction;
		double y = a.y + (b.y - a.y) * fraction;
		return point.distanceTo(new Point(x, y));
	}

	private static double projectionFraction(Point point, Point a, Point b)
	{
		double dx = b.x - a.x;
		double dy = b.y - a.y;
		double lengthSquared = dx * dx + dy * dy;
		if (lengthSquared == 0)
		{
			return 0;
		}
		double fraction = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
		return Math.max(0, Math.min(1, fraction));
	}

	private static double positiveOr(Double value, double fallback)
	{
		return value == null || value <= 0 ? fallback : value;
	}

	/**
	 * Rounds coordinates for the reported answers. Two decimal places is well below one pixel at any resolution the server renders at.
	 */
	static double round(double value)
	{
		return Math.round(value * 100.0) / 100.0;
	}
}

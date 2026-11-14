package nortantis.api;

import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.WorldGraph;
import nortantis.graph.voronoi.Center;
import nortantis.geom.Point;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Answers "where is the nearest place like this?", where "like this" is a kind of ground rather than a name: the nearest coast, the nearest
 * forest, the nearest river, the nearest lake.
 *
 * This is the counterpart to the world description. Names are all the world description can offer, and a great many questions are not about
 * names: a party that decides to walk to the sea is asking about terrain, and the answer may well be a stretch of shore that no settlement
 * stands on. Without a way to ask the map itself, an assistant holding only a place list has to answer such a question with the nearest
 * *named* thing that resembles it, which is how "walk to the beach" becomes "walk to the nearest town that has a harbour".
 *
 * The search runs over the same Voronoi cells the map was drawn from, so its answers agree with the picture, and it reports distances in
 * the world's resolution-invariant units so a caller can hand the result straight back to the route endpoint.
 *
 * Every criterion is a property of the map, not of any game: kinds of terrain, and whether a cell touches the sea, a lake, or a river. A
 * client maps its own words onto those - a beach is coastal land - and the service stays a map service.
 */
public final class WorldSearch
{
	/** How many distinct matches to answer with by default. */
	public static final int DEFAULT_LIMIT = 3;

	/** An upper bound on matches, so one request cannot ask for the whole coastline. */
	public static final int MAX_LIMIT = 20;

	/**
	 * How far apart, in resolution-invariant units, two matches have to be to count as different answers.
	 *
	 * Without this, the three nearest cells of one beach are three answers saying the same thing. A caller that wants adjacent cells can
	 * lower it.
	 */
	public static final double DEFAULT_SPACING = 60.0;

	/** How many terrain names to echo back when a caller asks for one this world does not have. */
	private static final int MAX_SUGGESTED_TERRAIN = 20;

	private WorldSearch()
	{
		// Static helpers only.
	}

	/** What to look for, and where to look from. Every criterion that is set must hold. */
	public static class MatchRequest
	{
		public RouteModel.Endpoint from;
		public List<String> terrain;
		/** True requires the coast, false requires land away from it, null ignores it. */
		public Boolean coast;
		/** True requires a river along one of the cell's own edges, false requires none. */
		public Boolean river;
		/** True requires a lake shore, false requires land away from any lake. */
		public Boolean lake;
		/** True allows water, false requires land, null lets the other criteria decide. */
		public Boolean water;
		/** Furthest to look, in resolution-invariant units. Unlimited when absent. */
		public Double maxDistance;
		public Double spacing;
		public Integer limit;
		public Double anchorCellSize;
	}

	/**
	 * Finds the nearest cells matching the request, nearest first.
	 *
	 * The answer reports {@code success=false} with an explanation rather than an empty list when the question itself cannot be answered,
	 * so a caller can tell "there is no coast here" from "you did not say what to look for".
	 */
	public static Map<String, Object> nearestMatch(MapSettings settings, WorldGraph graph, MatchRequest request)
	{
		Map<String, Object> result = new LinkedHashMap<>();
		if (graph == null || graph.centers == null || graph.centers.isEmpty())
		{
			result.put("success", false);
			result.put("message", "This world has no ground to search, because no graph is available for it.");
			return result;
		}

		double resolution = settings.resolution <= 0 ? 1.0 : settings.resolution;
		double anchorCellSize = positiveOr(request == null ? null : request.anchorCellSize, RouteModel.DEFAULT_ANCHOR_CELL_SIZE);

		RouteModel.Resolved from = RouteModel.resolve(graph, settings, request == null ? null : request.from, resolution);
		if (from == null)
		{
			result.put("success", false);
			result.put("message", "Give the point to search from as {\"from\": {\"x\": .., \"y\": ..}} or {\"from\": {\"name\": \"<place>\"}} naming a place in this world.");
			result.put("availablePlaces", RouteModel.placeNames(settings, 25));
			return result;
		}

		Set<TerrainType> terrains = EnumSet.noneOf(TerrainType.class);
		if (request != null && request.terrain != null)
		{
			for (String label : request.terrain)
			{
				TerrainType terrain = TerrainType.fromLabel(label);
				if (terrain == null)
				{
					result.put("success", false);
					result.put("message", "There is no terrain called '" + label + "' in this world.");
					result.put("availableTerrain", terrainLabels());
					return result;
				}
				terrains.add(terrain);
			}
		}

		Boolean coast = request == null ? null : request.coast;
		Boolean river = request == null ? null : request.river;
		Boolean lake = request == null ? null : request.lake;
		Boolean water = request == null ? null : request.water;

		if (terrains.isEmpty() && coast == null && river == null && lake == null && water == null)
		{
			result.put("success", false);
			result.put("message", "Say what to look for: one or more terrain names, or coast, river, lake or water.");
			result.put("availableTerrain", terrainLabels());
			return result;
		}

		double maxDistance = positiveOr(request == null ? null : request.maxDistance, Double.MAX_VALUE);
		double spacing = positiveOr(request == null ? null : request.spacing, DEFAULT_SPACING);
		int limit = clampLimit(request == null ? null : request.limit);

		List<Match> found = new ArrayList<>();
		for (Center center : graph.centers)
		{
			if (center == null || center.loc == null)
			{
				continue;
			}
			Point at = new Point(center.loc.x / resolution, center.loc.y / resolution);
			double distance = from.invariant.distanceTo(at);
			if (distance > maxDistance)
			{
				continue;
			}
			if (!matches(center, terrains, coast, river, lake, water))
			{
				continue;
			}
			found.add(new Match(center, at, distance));
		}
		found.sort((a, b) -> Double.compare(a.distance, b.distance));

		List<Map<String, Object>> matches = new ArrayList<>();
		List<Match> chosen = new ArrayList<>();
		for (Match match : found)
		{
			if (matches.size() >= limit)
			{
				break;
			}
			if (isTooCloseToAChosenMatch(match, chosen, spacing))
			{
				continue;
			}
			chosen.add(match);
			matches.add(describe(match, settings, graph, from, anchorCellSize));
		}

		result.put("success", true);
		result.put("from", RouteModel.describe(from, anchorCellSize));
		result.put("lookingFor", criteria(terrains, coast, river, lake, water));
		result.put("matches", matches);
		result.put("matchCount", matches.size());
		result.put("totalMatches", found.size());
		result.put("limitReached", found.size() > matches.size());
		result.put("unit", WorldModel.COORDINATE_SPACE);
		result.put("note", "A match is the middle of one map cell, so treat it as the centre of a patch of ground rather than an exact dot. "
				+ "Pass its x and y to the route endpoint to measure getting there.");
		return result;
	}

	/** One matching cell: the graph centre, the same point in the reported coordinate space, and how far it is from the query. */
	private static final class Match
	{
		final Center center;
		final Point at;
		final double distance;

		Match(Center center, Point at, double distance)
		{
			this.center = center;
			this.at = at;
			this.distance = distance;
		}
	}

	/**
	 * Whether a candidate is a new answer rather than another cell of one already given.
	 *
	 * The chosen matches are few, so a linear scan is both exact and cheaper than any index.
	 */
	private static boolean isTooCloseToAChosenMatch(Match candidate, List<Match> chosen, double spacing)
	{
		for (Match other : chosen)
		{
			if (other.at.distanceTo(candidate.at) < spacing)
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether one cell satisfies every criterion that was set. Unset criteria never exclude a cell.
	 *
	 * The tests read off the same graph the map was drawn from: a river is one of the cell's own edges, and a coast is a land cell beside
	 * the sea rather than beside a lake.
	 */
	private static boolean matches(Center center, Set<TerrainType> terrains, Boolean coast, Boolean river, Boolean lake, Boolean water)
	{
		TerrainType terrain = TerrainType.classify(center);
		if (!terrains.isEmpty() && !terrains.contains(terrain))
		{
			return false;
		}
		if (water != null && water != (!terrain.water))
		{
			return false;
		}
		if (coast != null && coast != TerrainType.isCoastal(center))
		{
			return false;
		}
		if (lake != null && lake != TerrainType.isLakeside(center))
		{
			return false;
		}
		if (river != null && river != center.isRiver())
		{
			return false;
		}
		return true;
	}

	private static Map<String, Object> describe(Match match, MapSettings settings, WorldGraph graph, RouteModel.Resolved from, double anchorCellSize)
	{
		Map<String, Object> entry = new LinkedHashMap<>();
		entry.put("x", RouteModel.round(match.at.x));
		entry.put("y", RouteModel.round(match.at.y));
		entry.put("distance", RouteModel.round(match.distance));
		entry.put("direction", direction(from.invariant, match.at));
		entry.put("terrain", TerrainType.classify(match.center).label);
		entry.put("coastal", TerrainType.isCoastal(match.center));
		entry.put("lake", TerrainType.isLakeside(match.center));
		entry.put("river", match.center.isRiver());
		entry.put("anchor", RouteModel.anchorFor(match.at, anchorCellSize));

		MapText nearest = RouteModel.closestPlace(settings, match.at);
		if (nearest != null && nearest.location != null)
		{
			Map<String, Object> place = new LinkedHashMap<>();
			place.put("name", nearest.value == null ? null : nearest.value.trim());
			place.put("type", nearest.type == null ? null : nearest.type.name());
			place.put("x", RouteModel.round(nearest.location.x));
			place.put("y", RouteModel.round(nearest.location.y));
			place.put("distance", RouteModel.round(match.at.distanceTo(nearest.location)));
			entry.put("nearestPlace", place);
		}

		entry.put("region", RouteModel.describeRegion(settings, graph, match.center.region));
		return entry;
	}

	/**
	 * Which way a match lies from the query, as one of the eight compass points.
	 *
	 * The map's y axis grows downward, so north is negative y; getting that backwards would send a party the wrong way along a coast.
	 */
	private static String direction(Point from, Point to)
	{
		double dx = to.x - from.x;
		double dy = to.y - from.y;
		if (dx == 0 && dy == 0)
		{
			return "here";
		}
		double degrees = (Math.toDegrees(Math.atan2(dx, -dy)) + 360.0) % 360.0;
		String[] compass = { "north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west" };
		return compass[(int) Math.round(degrees / 45.0) % 8];
	}

	/** The request as the answer reports it, so a caller can see what was actually searched for. */
	private static Map<String, Object> criteria(Set<TerrainType> terrains, Boolean coast, Boolean river, Boolean lake, Boolean water)
	{
		Map<String, Object> lookingFor = new LinkedHashMap<>();
		if (!terrains.isEmpty())
		{
			List<String> labels = new ArrayList<>();
			for (TerrainType terrain : terrains)
			{
				labels.add(terrain.label);
			}
			lookingFor.put("terrain", labels);
		}
		if (coast != null)
		{
			lookingFor.put("coast", coast);
		}
		if (river != null)
		{
			lookingFor.put("river", river);
		}
		if (lake != null)
		{
			lookingFor.put("lake", lake);
		}
		if (water != null)
		{
			lookingFor.put("water", water);
		}
		return lookingFor;
	}

	/** Every terrain this world can report, so a caller asking for an unknown one is told what it could have asked for. */
	private static List<String> terrainLabels()
	{
		List<String> labels = new ArrayList<>(MAX_SUGGESTED_TERRAIN);
		for (TerrainType terrain : TerrainType.values())
		{
			labels.add(terrain.label);
		}
		return labels;
	}

	private static int clampLimit(Integer requested)
	{
		if (requested == null || requested <= 0)
		{
			return DEFAULT_LIMIT;
		}
		return Math.min(MAX_LIMIT, requested);
	}

	private static double positiveOr(Double value, double fallback)
	{
		return value == null || value <= 0 ? fallback : value;
	}
}

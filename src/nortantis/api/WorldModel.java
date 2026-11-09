package nortantis.api;

import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.Region;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.RegionEdit;
import nortantis.editor.Road;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.Color;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Projects a generated map into a compact description of the world: the named places, the political regions with their names, and the roads
 * between them.
 *
 * This exists because the canonical {@link MapSettings} JSON is the editor's format, not a description of a world. It carries tens of
 * thousands of index-keyed center edits, which is unusable as context for a language model and awkward for a client to traverse. This
 * projection keeps only the parts that describe locations, and is stable enough to be consumed directly.
 *
 * Coordinates use the same resolution-invariant space as MapSettings edits, so a place sits at the same coordinates regardless of the
 * resolution the map was rendered at.
 */
public class WorldModel
{
	/**
	 * Name for the coordinate space used by place, region and road coordinates. Resolution-invariant units are independent of the render
	 * resolution, so the same world describes the same locations at every resolution.
	 */
	public static final String COORDINATE_SPACE = "resolutionInvariant";

	private WorldModel()
	{
		// Static helpers only.
	}

	/**
	 * Builds the world description for a generated map.
	 *
	 * @param settings
	 *            Settings that were used to generate the map. Their edits describe the places and roads.
	 * @param graph
	 *            The generated graph, used to resolve regions and to attach region names to region ids. May be null, in which case regions
	 *            are reported without geometry.
	 */
	public static Map<String, Object> build(MapSettings settings, WorldGraph graph)
	{
		Map<String, Object> world = new LinkedHashMap<>();
		world.put("coordinateSpace", COORDINATE_SPACE);
		world.put("seed", settings.randomSeed);
		world.put("textSeed", settings.textRandomSeed);
		world.put("worldSize", settings.worldSize);
		world.put("resolution", settings.resolution);
		world.put("imageWidth", settings.generatedWidth);
		world.put("imageHeight", settings.generatedHeight);

		List<Map<String, Object>> places = buildPlaces(settings);
		List<Map<String, Object>> regions = buildRegions(settings, graph);
		List<Map<String, Object>> roads = buildRoads(settings);

		world.put("places", places);
		world.put("regions", regions);
		world.put("roads", roads);

		Map<String, Object> counts = new LinkedHashMap<>();
		counts.put("places", places.size());
		counts.put("regions", regions.size());
		counts.put("roads", roads.size());
		world.put("counts", counts);

		return world;
	}

	/**
	 * Every named location on the map. Text types are what distinguish a city from a lake, a river, a mountain range or a region label.
	 */
	private static List<Map<String, Object>> buildPlaces(MapSettings settings)
	{
		List<Map<String, Object>> places = new ArrayList<>();
		if (settings.edits == null || settings.edits.text == null)
		{
			return places;
		}

		for (MapText text : settings.edits.text)
		{
			if (text == null || text.location == null || text.value == null || text.value.trim().isEmpty())
			{
				continue;
			}

			Map<String, Object> place = new LinkedHashMap<>();
			place.put("name", text.value.trim());
			place.put("type", text.type == null ? null : text.type.name());
			place.put("x", round(text.location.x));
			place.put("y", round(text.location.y));
			places.add(place);
		}

		return places;
	}

	/**
	 * The political regions, with the name that was generated for each one.
	 *
	 * Region names are generated as ordinary map text rather than being stored on the region itself, so each non-blank region label is
	 * attributed to the region containing the point where it was placed. A region with no label of its own reports a null name.
	 */
	private static List<Map<String, Object>> buildRegions(MapSettings settings, WorldGraph graph)
	{
		List<Map<String, Object>> regions = new ArrayList<>();
		if (graph == null || graph.regions == null)
		{
			return regions;
		}

		Map<Integer, String> namesByRegionId = attributeRegionNames(settings, graph);

		List<Region> sorted = new ArrayList<>(graph.regions.values());
		sorted.sort(Comparator.comparingInt(region -> region.id));

		for (Region region : sorted)
		{
			Map<String, Object> entry = new LinkedHashMap<>();
			entry.put("id", region.id);
			entry.put("name", namesByRegionId.get(region.id));
			entry.put("color", regionColorHex(settings, region.id));

			Point centroid = region.getCenters().isEmpty() ? null : WorldGraph.findCentroid(region.getCenters());
			if (centroid != null)
			{
				entry.put("centerX", round(toInvariant(centroid.x, settings.resolution)));
				entry.put("centerY", round(toInvariant(centroid.y, settings.resolution)));
			}

			entry.put("centerCount", region.getCenters().size());
			regions.add(entry);
		}

		return regions;
	}

	private static Map<Integer, String> attributeRegionNames(MapSettings settings, WorldGraph graph)
	{
		Map<Integer, String> namesByRegionId = new HashMap<>();
		if (settings.edits == null || settings.edits.text == null)
		{
			return namesByRegionId;
		}

		for (MapText text : settings.edits.text)
		{
			if (text == null || text.type != TextType.Region || text.location == null || text.value == null || text.value.trim().isEmpty())
			{
				continue;
			}

			Center containing = graph.findClosestCenter(toGraph(text.location, settings.resolution), false);
			if (containing == null || containing.region == null)
			{
				continue;
			}

			namesByRegionId.putIfAbsent(containing.region.id, text.value.trim());
		}

		return namesByRegionId;
	}

	private static String regionColorHex(MapSettings settings, int regionId)
	{
		if (settings.edits == null || settings.edits.regionEdits == null)
		{
			return null;
		}

		RegionEdit edit = settings.edits.regionEdits.get(regionId);
		if (edit == null || edit.color == null)
		{
			return null;
		}

		return toHex(edit.color);
	}

	/**
	 * Roads as whole routes rather than as hundreds of individual points, which is the useful shape for "what connects these two places".
	 */
	private static List<Map<String, Object>> buildRoads(MapSettings settings)
	{
		List<Map<String, Object>> roads = new ArrayList<>();
		if (settings.edits == null || settings.edits.roads == null)
		{
			return roads;
		}

		for (Road road : settings.edits.roads)
		{
			if (road == null || road.path == null || road.path.isEmpty())
			{
				continue;
			}

			Point start = road.path.get(0);
			Point end = road.path.get(road.path.size() - 1);

			Map<String, Object> entry = new LinkedHashMap<>();
			entry.put("startX", round(toInvariant(start.x, settings.resolution)));
			entry.put("startY", round(toInvariant(start.y, settings.resolution)));
			entry.put("endX", round(toInvariant(end.x, settings.resolution)));
			entry.put("endY", round(toInvariant(end.y, settings.resolution)));
			entry.put("length", round(toInvariant(polylineLength(road.path), settings.resolution)));
			entry.put("pointCount", road.path.size());
			roads.add(entry);
		}

		return roads;
	}

	private static double polylineLength(List<Point> path)
	{
		double total = 0;
		for (int i = 1; i < path.size(); i++)
		{
			total += path.get(i - 1).distanceTo(path.get(i));
		}
		return total;
	}

	private static String toHex(Color color)
	{
		return String.format(Locale.ROOT, "#%02x%02x%02x", color.getRed(), color.getGreen(), color.getBlue());
	}

	/**
	 * Map text stores locations in resolution-invariant units, while the graph, region centroids and road paths live in image space.
	 * Convert with the resolution the map was rendered at.
	 */
	private static Point toGraph(Point resolutionInvariant, double resolution)
	{
		return new Point(resolutionInvariant.x * resolution, resolutionInvariant.y * resolution);
	}

	private static double toInvariant(double imageSpaceValue, double resolution)
	{
		return imageSpaceValue / resolution;
	}

	/**
	 * Rounds coordinates so the response is readable and stable. Two decimal places is well below one pixel at the resolutions the server
	 * renders at.
	 */
	private static double round(double value)
	{
		return Math.round(value * 100.0) / 100.0;
	}
}

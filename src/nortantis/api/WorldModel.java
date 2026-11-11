package nortantis.api;

import nortantis.IconType;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.Region;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.FreeIcon;
import nortantis.editor.RegionEdit;
import nortantis.editor.Road;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.Color;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
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

	/**
	 * The furthest, in image pixels, that a place's label may sit from the icon drawn for it.
	 *
	 * The renderer never draws a name on its pictogram: a settlement's name goes above the icon, or below it when the space above is taken,
	 * by roughly half the icon plus a line of text. Anything past this bound is not that label's drawing but another place's, so a label
	 * added by hand with no pictogram of its own does not claim the town next to it.
	 */
	private static final double MAX_LABEL_ICON_GAP = 300.0;

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

		List<Map<String, Object>> places = buildPlaces(settings, graph, WorldSurroundings.forWorld(graph));
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
	 *
	 * Each place also carries the ground around it and the region it belongs to, when the graph is available to read them from, so a client
	 * can tell a fishing village from a mountain fortress and can say which territory the place is in instead of guessing.
	 *
	 * Coordinates are where the place is drawn. A settlement's label sits beside its pictogram rather than on it, so the drawing's centre
	 * is what a mark saying "the party is here" belongs on; a label with no drawing of its own reports the label.
	 */
	private static List<Map<String, Object>> buildPlaces(MapSettings settings, WorldGraph graph, WorldSurroundings surroundings)
	{
		List<Map<String, Object>> places = new ArrayList<>();
		if (settings.edits == null || settings.edits.text == null)
		{
			return places;
		}

		List<FreeIcon> drawings = placeIcons(settings);

		for (MapText text : settings.edits.text)
		{
			if (text == null || text.location == null || text.value == null || text.value.trim().isEmpty())
			{
				continue;
			}

			Map<String, Object> place = new LinkedHashMap<>();
			place.put("name", text.value.trim());
			place.put("type", text.type == null ? null : text.type.name());
			FreeIcon drawing = drawingFor(text, drawings, settings.resolution);
			Point at = drawing != null ? drawing.locationResolutionInvariant : text.location;
			place.put("x", round(at.x));
			place.put("y", round(at.y));

			// One lookup answers both questions about the map underneath this place: which region it is in, and what
			// the ground around it is like.
			Center containing = graph == null ? null : graph.findClosestCenter(toGraph(at, settings.resolution), false);
			if (containing != null && containing.region != null)
			{
				place.put("regionId", containing.region.id);
			}

			// A title and a region label are not places a party stands in, so describing the ground under them would
			// only invite a reader to treat them as somewhere a scene happens.
			if (surroundings != null && text.type != TextType.Title && text.type != TextType.Region)
			{
				Map<String, Object> described = surroundings.describe(containing);
				if (described != null)
				{
					place.put("surroundings", described);
				}
			}
			places.add(place);
		}

		return places;
	}

	/**
	 * The icons that are a place's drawing rather than scenery: a settlement's pictogram, and the marker that flags a site the story added.
	 *
	 * Trees, hills, mountains and dunes are deliberately left out, so no label can claim a forest as where it stands.
	 */
	private static List<FreeIcon> placeIcons(MapSettings settings)
	{
		List<FreeIcon> icons = new ArrayList<>();
		if (settings.edits == null || settings.edits.freeIcons == null)
		{
			return icons;
		}
		for (FreeIcon icon : settings.edits.freeIcons)
		{
			if (icon == null || icon.locationResolutionInvariant == null)
			{
				continue;
			}
			if (icon.type == IconType.cities || isSiteMarker(icon))
			{
				icons.add(icon);
			}
		}
		return icons;
	}

	/** Whether an icon is the marker {@link PlaceMarker} draws above a site the story added. */
	private static boolean isSiteMarker(FreeIcon icon)
	{
		return icon.type == IconType.decorations && PlaceMarker.MARKER_ICON.equals(icon.iconName);
	}

	/**
	 * The icon drawn for a place, or null when the place has none this world can point at.
	 *
	 * Only kinds that belong to the place are considered — a settlement's pictogram for a city, the site marker for a landmark — and the
	 * nearest one wins, because a label is drawn beside its own pictogram and nowhere near another place's.
	 */
	private static FreeIcon drawingFor(MapText text, List<FreeIcon> icons, double resolution)
	{
		FreeIcon nearest = null;
		double nearestDistance = Double.MAX_VALUE;
		for (FreeIcon icon : icons)
		{
			if (!iconMatchesTextKind(icon, text.type))
			{
				continue;
			}
			double dx = icon.locationResolutionInvariant.x - text.location.x;
			double dy = icon.locationResolutionInvariant.y - text.location.y;
			double distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < nearestDistance)
			{
				nearest = icon;
				nearestDistance = distance;
			}
		}
		if (nearest == null || nearestDistance * resolution > MAX_LABEL_ICON_GAP)
		{
			return null;
		}
		return nearest;
	}

	private static boolean iconMatchesTextKind(FreeIcon icon, TextType type)
	{
		if (type == TextType.City)
		{
			return icon.type == IconType.cities;
		}
		if (type == TextType.Landmark)
		{
			return isSiteMarker(icon);
		}
		return false;
	}

	/**
	 * The political regions, with the name that was generated for each one.
	 *
	 * Region names are generated as ordinary map text rather than being stored on the region itself, so each non-blank region label is
	 * attributed to the region containing the point where it was placed. A region with no label of its own reports a null name. Each entry
	 * reports {@code "type": "Region"} so a client knows the name is a territory rather than a settlement, and the terrain most of the
	 * territory is, so a campaign built on regions knows what each one can grow, mine or trade.
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
			// Say what the name is: a region is a territory, and a client that only receives the name can otherwise
			// mistake it for a settlement and write about its streets.
			entry.put("type", "Region");
			entry.put("terrain", dominantRegionTerrain(region));
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

	/**
	 * The terrain most of a region's land is, so a campaign can say what a territory is like without reading the graph itself.
	 *
	 * Water cells are left out because a region is land, and a client reading "lake" as a territory's terrain would put a lake where a
	 * province is. Null means the region holds no land at all, which is reported as an absence rather than a guessed terrain.
	 */
	private static String dominantRegionTerrain(Region region)
	{
		Map<TerrainType, Integer> counts = new EnumMap<>(TerrainType.class);
		for (Center center : region.getCenters())
		{
			TerrainType terrain = TerrainType.classify(center);
			if (!terrain.water)
			{
				counts.merge(terrain, 1, Integer::sum);
			}
		}

		TerrainType dominant = TerrainType.dominant(counts);
		return dominant == null ? null : dominant.label;
	}

	public static Map<Integer, String> attributeRegionNames(MapSettings settings, WorldGraph graph)
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

	static double toInvariant(double imageSpaceValue, double resolution)
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

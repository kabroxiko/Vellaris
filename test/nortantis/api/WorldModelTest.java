package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.IconType;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.Region;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.FreeIcon;
import nortantis.editor.MapEdits;
import nortantis.editor.Road;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Covers the projection from a generated map to the compact world description, including the two coordinate-space conversions it has to get
 * right: map text stores resolution-invariant locations while the graph uses image space, and the response reports everything in the
 * resolution-invariant space so a client can compare places, regions and roads directly.
 */
public class WorldModelTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	@BeforeAll
	public static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();
	}

	private static MapSettings loadSettings(double resolution)
	{
		MapSettings settings = new MapSettings(settingsPath);
		settings.resolution = resolution;
		settings.edits = new MapEdits();
		settings.edits.text.clear();
		settings.edits.roads.clear();
		return settings;
	}

	/** The largest land region, which is guaranteed to have centers. */
	private static Region largestRegion(WorldGraph graph)
	{
		return graph.regions.values().stream().max(Comparator.comparingInt(region -> region.getCenters().size())).orElseThrow();
	}

	private static Map<String, Object> findRegion(List<Map<String, Object>> regions, int regionId)
	{
		return regions.stream().filter(entry -> ((Number) entry.get("id")).intValue() == regionId).findFirst().orElseThrow();
	}

	@Test
	public void regionLabelIsAttributedToTheRegionContainingIt()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		Region region = largestRegion(graph);
		Point centroid = WorldGraph.findCentroid(region.getCenters());
		assertNotNull(centroid, "The largest region should have a centroid");

		// Map text stores resolution-invariant locations, so the label goes at the centroid converted out of image space.
		Point labelLocation = new Point(centroid.x / resolution, centroid.y / resolution);
		settings.edits.text.add(new MapText("Testland", labelLocation, 0.0, TextType.Region, null, null, null, 0.0, 0, null, 0.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> regions = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("regions");

		Map<String, Object> entry = findRegion(regions, region.id);
		assertEquals("Testland", entry.get("name"), "The region label should be attributed to the region containing it");
		assertEquals(((Number) entry.get("centerCount")).intValue(), region.getCenters().size());
		assertTrue(entry.get("terrain") instanceof String, "A region reports the terrain most of its land is");
		assertFalse(((String) entry.get("terrain")).isEmpty(), "The region terrain label is never blank");

		// Everything is reported in resolution-invariant units, so the region's reported centre should coincide with the label that was
		// placed at that same point.
		assertEquals(labelLocation.x, ((Number) entry.get("centerX")).doubleValue(), 0.01);
		assertEquals(labelLocation.y, ((Number) entry.get("centerY")).doubleValue(), 0.01);
	}

	@Test
	public void placesReportNameTypeAndResolutionInvariantCoordinates()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		settings.edits.text.add(new MapText("Brookhollow", new Point(120.0, 240.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));
		settings.edits.text.add(new MapText("Lake Thenn", new Point(300.0, 90.0), 0.0, TextType.Lake, null, null, null, 0.0, 0, null, 0.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		assertEquals(2, places.size());
		assertEquals("Brookhollow", places.get(0).get("name"));
		assertEquals("City", places.get(0).get("type"));
		assertEquals(120.0, ((Number) places.get(0).get("x")).doubleValue(), 0.001);
		assertEquals(240.0, ((Number) places.get(0).get("y")).doubleValue(), 0.001);
		assertEquals("Lake", places.get(1).get("type"));
	}

	@Test
	public void placesReportTheRegionTheyAreIn()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		// A region's own centre is inside the region, so the label placed there must resolve back to that region.
		Region region = largestRegion(graph);
		Center inside = region.getCenters().iterator().next();
		settings.edits.text.add(new MapText("Brookhollow", new Point(inside.loc.x / resolution, inside.loc.y / resolution), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		assertTrue(places.get(0).get("regionId") instanceof Number, "a place reports the region it belongs to");
		assertEquals(region.id, ((Number) places.get(0).get("regionId")).intValue(), "the region is the one containing the place");
	}

	@Test
	public void aSettlementReportsThePointOfItsDrawingNotJustItsLabel()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		// A town's name is drawn above its pictogram, so the place reports both: the label it was stored at and the
		// centre of the drawing a pin belongs on.
		settings.edits.text.add(new MapText("Brookhollow", new Point(120.0, 240.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));
		settings.edits.freeIcons.addOrReplace(cityIcon(new Point(120.0, 210.0), "town"));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		assertEquals(120.0, ((Number) places.get(0).get("x")).doubleValue(), 0.001, "the label keeps its own point");
		assertEquals(240.0, ((Number) places.get(0).get("y")).doubleValue(), 0.001);
		assertEquals(120.0, ((Number) places.get(0).get("iconX")).doubleValue(), 0.001, "the drawing's centre is reported");
		assertEquals(210.0, ((Number) places.get(0).get("iconY")).doubleValue(), 0.001);
	}

	@Test
	public void aPlaceWithNoDrawingNearbyReportsNone()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		// A hand-added label far from every pictogram is not the name of the town on the other side of the map.
		settings.edits.text.add(new MapText("Brookhollow", new Point(120.0, 240.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));
		settings.edits.freeIcons.addOrReplace(cityIcon(new Point(2000.0, 2000.0), "walled city"));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		assertFalse(places.get(0).containsKey("iconX"), "a distant pictogram belongs to another place");
		assertFalse(places.get(0).containsKey("iconY"));
	}

	@Test
	public void aSceneryIconIsNeverAPlacesDrawing()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		// A forest drawn right under the label is not where the town is drawn.
		settings.edits.text.add(new MapText("Brookhollow", new Point(120.0, 240.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));
		settings.edits.freeIcons.addOrReplace(new FreeIcon(new Point(122.0, 242.0), 1.0, IconType.trees, "nortantis", "trees", -1, "oak", null, 0.0, MapSettings.defaultIconFillColor,
				MapSettings.defaultIconFilterColor, false, false, 1.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		assertFalse(places.get(0).containsKey("iconX"));
	}

	private static FreeIcon cityIcon(Point location, String iconName)
	{
		return new FreeIcon(location, 1.0, IconType.cities, "nortantis", "towns", -1, iconName, null, 0.0, MapSettings.defaultIconFillColor, MapSettings.defaultIconFilterColor, false, false, 1.0);
	}

	@Test
	public void roadsReportEndpointsAndLengthInResolutionInvariantUnits()
	{
		double resolution = 0.5;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		// A road 300 image-space units long, which is 600 resolution-invariant units at resolution 0.5.
		List<Point> path = new ArrayList<>(Arrays.asList(new Point(0, 0), new Point(150, 0), new Point(300, 0)));
		settings.edits.roads.add(new Road(path));

		@SuppressWarnings("unchecked")
		Map<String, Object> world = WorldModel.build(settings, graph);
		@SuppressWarnings("unchecked")
		List<Map<String, Object>> roads = (List<Map<String, Object>>) world.get("roads");

		assertEquals(1, roads.size());
		assertEquals(600.0, ((Number) roads.get(0).get("length")).doubleValue(), 0.01);
		assertEquals(0.0, ((Number) roads.get(0).get("startX")).doubleValue(), 0.01);
		assertEquals(600.0, ((Number) roads.get(0).get("endX")).doubleValue(), 0.01);
	}

	@Test
	public void placesReportWhatSurroundsThem()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		Center land = graph.centers.stream().filter(center -> !center.isWater).findFirst().orElseThrow();
		settings.edits.text.add(new MapText("Brookhollow", new Point(land.loc.x / resolution, land.loc.y / resolution), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		@SuppressWarnings("unchecked")
		Map<String, Object> surroundings = (Map<String, Object>) places.get(0).get("surroundings");
		assertNotNull(surroundings, "a place on a generated graph reports the ground around it");
		assertTrue(surroundings.get("terrain") instanceof String, "the terrain a place stands on is reported");
		assertFalse(((String) surroundings.get("terrain")).isEmpty(), "the terrain label is never blank");
		for (String flag : Arrays.asList("coastal", "lake", "river", "mountains", "island"))
		{
			assertTrue(surroundings.get(flag) instanceof Boolean, flag + " is reported as a boolean");
		}
	}

	@Test
	public void aPlaceStandingOnWaterReportsThatWater()
	{
		double resolution = 0.75;
		MapSettings settings = loadSettings(resolution);
		WorldGraph graph = MapCreator.createGraphForUnitTests(settings);

		Center water = graph.centers.stream().filter(center -> center.isWater && center.isLake).findFirst()
				.orElseGet(() -> graph.centers.stream().filter(center -> center.isWater).findFirst().orElseThrow());
		settings.edits.text.add(new MapText("Lake Thenn", new Point(water.loc.x / resolution, water.loc.y / resolution), 0.0, TextType.Lake, null, null, null, 0.0, 0, null, 0.0));

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) WorldModel.build(settings, graph).get("places");

		@SuppressWarnings("unchecked")
		Map<String, Object> surroundings = (Map<String, Object>) places.get(0).get("surroundings");
		assertEquals(water.isLake ? "lake" : "ocean", surroundings.get("terrain"), "a label standing on water reads as that water");
		assertEquals(water.isLake, surroundings.get("lake"));
		assertEquals(Boolean.FALSE, surroundings.get("island"), "water is not an island");
	}

	@Test
	public void buildToleratesAMissingGraph()
	{
		MapSettings settings = loadSettings(1.0);
		settings.edits.text.add(new MapText("Nowhere", new Point(10.0, 20.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));

		Map<String, Object> world = WorldModel.build(settings, null);

		@SuppressWarnings("unchecked")
		List<Map<String, Object>> places = (List<Map<String, Object>>) world.get("places");
		@SuppressWarnings("unchecked")
		List<Map<String, Object>> regions = (List<Map<String, Object>>) world.get("regions");

		assertEquals(1, places.size());
		assertTrue(regions.isEmpty(), "Without a graph there is no region geometry to report");
		assertFalse(places.get(0).containsKey("surroundings"), "Without a graph there is no ground to describe, so nothing is invented");
		assertEquals(WorldModel.COORDINATE_SPACE, world.get("coordinateSpace"));
	}
}

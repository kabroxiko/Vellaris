package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.Region;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.MapEdits;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Covers the query endpoints: routing between locations, the terrain and travel figures they report, and the anchors a caller keys its own
 * notes on.
 */
public class RouteModelTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	private static MapSettings settings;
	private static WorldGraph graph;

	@BeforeAll
	public static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();

		settings = new MapSettings(settingsPath);
		settings.resolution = 1.0;
		settings.edits = new MapEdits();
		graph = MapCreator.createGraphForUnitTests(settings);
	}

	private static Region largestRegion()
	{
		return graph.regions.values().stream().max(Comparator.comparingInt(region -> region.getCenters().size())).orElseThrow();
	}

	private static RouteModel.RouteRequest request(Point from, Point to)
	{
		RouteModel.Endpoint fromEndpoint = new RouteModel.Endpoint();
		fromEndpoint.x = from.x;
		fromEndpoint.y = from.y;

		RouteModel.Endpoint toEndpoint = new RouteModel.Endpoint();
		toEndpoint.x = to.x;
		toEndpoint.y = to.y;

		RouteModel.RouteRequest request = new RouteModel.RouteRequest();
		request.from = fromEndpoint;
		request.to = toEndpoint;
		return request;
	}

	@SuppressWarnings("unchecked")
	private static List<Map<String, Object>> waypoints(Map<String, Object> route)
	{
		return (List<Map<String, Object>>) route.get("waypoints");
	}

	@SuppressWarnings("unchecked")
	private static Map<String, Object> travel(Map<String, Object> route)
	{
		return (Map<String, Object>) route.get("travel");
	}

	@Test
	public void routesBetweenTwoCentersOfTheSameRegion()
	{
		List<Center> centers = new ArrayList<>(largestRegion().getCenters());
		Point from = centers.get(0).loc;
		Point to = centers.get(centers.size() - 1).loc;

		Map<String, Object> route = RouteModel.route(settings, graph, request(from, to));

		assertEquals(Boolean.TRUE, route.get("success"));
		assertEquals(Boolean.TRUE, route.get("reachable"), "Two centers in the same region must be walkable between");
		assertTrue(((Number) route.get("distance")).doubleValue() > 0);

		Map<String, Object> travel = travel(route);
		assertTrue(((Number) travel.get("days")).doubleValue() > 0, "A non-zero distance must take a non-zero time");
		assertFalse(((List<?>) travel.get("terrain")).isEmpty(), "Terrain along the route should be reported");
	}

	/**
	 * The reported distance and the waypoint polyline are computed from different data, so agreement between them is a real check that the
	 * path was assembled in the right order. A mis-ordered path silently reports a longer, wandering route.
	 */
	@Test
	public void waypointsTraceTheSameRouteAsTheReportedDistance()
	{
		List<Center> centers = new ArrayList<>(largestRegion().getCenters());
		Point from = centers.get(0).loc;
		Point to = centers.get(centers.size() - 1).loc;

		Map<String, Object> route = RouteModel.route(settings, graph, request(from, to));
		List<Map<String, Object>> waypoints = waypoints(route);

		assertFalse(waypoints.isEmpty());

		double polylineLength = 0;
		for (int i = 1; i < waypoints.size(); i++)
		{
			Point previous = new Point(((Number) waypoints.get(i - 1).get("x")).doubleValue(), ((Number) waypoints.get(i - 1).get("y")).doubleValue());
			Point current = new Point(((Number) waypoints.get(i).get("x")).doubleValue(), ((Number) waypoints.get(i).get("y")).doubleValue());
			polylineLength += previous.distanceTo(current);
		}

		double reported = ((Number) route.get("distance")).doubleValue();
		assertEquals(reported, polylineLength, Math.max(1.0, reported * 0.02), "The waypoints should trace the route the distance was measured along");

		// The first and last waypoints should coincide with the requested endpoints.
		Point first = new Point(((Number) waypoints.get(0).get("x")).doubleValue(), ((Number) waypoints.get(0).get("y")).doubleValue());
		Point last = new Point(((Number) waypoints.get(waypoints.size() - 1).get("x")).doubleValue(), ((Number) waypoints.get(waypoints.size() - 1).get("y")).doubleValue());
		assertTrue(first.distanceTo(from) < Math.max(5.0, reported * 0.1), "The route should start at the start");
		assertTrue(last.distanceTo(to) < Math.max(5.0, reported * 0.1), "The route should end at the destination");
	}

	@Test
	public void routingToTheSamePlaceIsZeroDistance()
	{
		Point point = new ArrayList<>(largestRegion().getCenters()).get(0).loc;
		Map<String, Object> route = RouteModel.route(settings, graph, request(point, point));

		assertEquals(Boolean.TRUE, route.get("success"));
		assertEquals(Boolean.TRUE, route.get("reachable"));
		assertEquals(0.0, ((Number) route.get("distance")).doubleValue(), 1e-9);
	}

	@Test
	public void aWaterDestinationIsUnreachableOnFoot()
	{
		Center ocean = graph.centers.stream().filter(center -> center.isWater && !center.isLake).findFirst().orElse(null);
		if (ocean == null)
		{
			// Not every generated world has ocean centers; nothing to assert.
			return;
		}

		Point from = new ArrayList<>(largestRegion().getCenters()).get(0).loc;
		Map<String, Object> route = RouteModel.route(settings, graph, request(from, ocean.loc));

		assertEquals(Boolean.TRUE, route.get("success"));
		assertEquals(Boolean.FALSE, route.get("reachable"), "An ocean center is not walkable to");
	}

	@Test
	public void unresolvableEndpointsAreReportedNotThrown()
	{
		RouteModel.RouteRequest request = new RouteModel.RouteRequest();
		request.from = new RouteModel.Endpoint();
		request.from.name = "This Place Does Not Exist";
		request.to = new RouteModel.Endpoint();
		request.to.name = "Neither Does This One";

		Map<String, Object> route = RouteModel.route(settings, graph, request);

		assertEquals(Boolean.FALSE, route.get("success"));
		assertNotNull(route.get("message"));
	}

	@Test
	public void nearestFindsThePlaceAtItsOwnCoordinates()
	{
		settings.edits.text.add(new MapText("Brookhollow", new Point(120.0, 240.0), 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0));
		try
		{
			RouteModel.PointRequest request = new RouteModel.PointRequest();
			request.x = 122.0;
			request.y = 241.0;

			Map<String, Object> nearest = RouteModel.nearest(settings, graph, request);

			assertEquals(Boolean.TRUE, nearest.get("success"));
			@SuppressWarnings("unchecked")
			Map<String, Object> place = (Map<String, Object>) nearest.get("place");
			assertNotNull(place, "nearest returned: " + nearest);
			assertEquals("Brookhollow", place.get("name"));
			assertTrue(((Number) place.get("distance")).doubleValue() < 5.0);
			assertNotNull(nearest.get("anchor"));
			// A point can legitimately fall outside every political region, so the key is always present but the value may be null.
			assertTrue(nearest.containsKey("region"));
		}
		finally
		{
			settings.edits.text.removeIf(text -> "Brookhollow".equals(text.value));
		}
	}

	@Test
	public void anchorsAreStableAndCoarse()
	{
		double cellSize = 50.0;
		String near1 = RouteModel.anchorFor(new Point(10, 10), cellSize);
		String near2 = RouteModel.anchorFor(new Point(20, 20), cellSize);
		String far = RouteModel.anchorFor(new Point(60, 10), cellSize);

		assertEquals(near1, near2, "Nearby points should share an anchor so notes group together");
		assertNotEquals(near1, far, "Points in different cells should not share an anchor");
		assertEquals(near1, RouteModel.anchorFor(new Point(10, 10), cellSize), "Anchors must be deterministic");
	}
}

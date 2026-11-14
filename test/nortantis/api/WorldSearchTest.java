package nortantis.api;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.MapEdits;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Covers the "where is the nearest ground like this" query: the searches it can answer from the graph, and the mistakes in a request that
 * it has to report instead of answering with an empty list.
 */
public class WorldSearchTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	private static final Set<String> COMPASS = Set.of("north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west", "here");

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

	@AfterEach
	public void clearPlaces()
	{
		settings.edits.text = null;
	}

	@SuppressWarnings("unchecked")
	private static List<Map<String, Object>> matches(Map<String, Object> answer)
	{
		return (List<Map<String, Object>>) answer.get("matches");
	}

	private static double number(Map<String, Object> entry, String key)
	{
		return ((Number) entry.get(key)).doubleValue();
	}

	/** An inland cell: land with no sea in sight, which is where a party asking for the beach is standing. */
	private static Center inlandCenter()
	{
		for (Center center : graph.centers)
		{
			if (!center.isWater && !TerrainType.isCoastal(center))
			{
				return center;
			}
		}
		throw new AssertionError("The test world has no inland land, so it cannot exercise this query");
	}

	private static RouteModel.Endpoint at(Center center, double resolution)
	{
		RouteModel.Endpoint endpoint = new RouteModel.Endpoint();
		endpoint.x = center.loc.x / resolution;
		endpoint.y = center.loc.y / resolution;
		return endpoint;
	}

	private static WorldSearch.MatchRequest from(Center center)
	{
		WorldSearch.MatchRequest request = new WorldSearch.MatchRequest();
		request.from = at(center, settings.resolution);
		return request;
	}

	@Test
	public void findsTheNearestCoastFromAnInlandPoint()
	{
		WorldSearch.MatchRequest request = from(inlandCenter());
		request.coast = true;
		request.limit = 1;

		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, request);

		assertEquals(Boolean.TRUE, answer.get("success"));
		assertEquals(1, matches(answer).size(), "The test world has a coast, and it must be found from inland");

		Map<String, Object> match = matches(answer).get(0);
		assertEquals(Boolean.TRUE, match.get("coastal"), "A claimed coast has to be land beside the sea");
		assertTrue(number(match, "distance") > 0);

		Center found = centerAt(match);
		assertFalse(found.isWater, "Coastal means land, not water");
		assertTrue(TerrainType.isCoastal(found), "The reported point must really be on the coast");
	}

	@Test
	public void answersAreOrderedByDistanceAndDescribeDifferentGround()
	{
		WorldSearch.MatchRequest request = from(inlandCenter());
		request.coast = true;
		request.limit = 3;

		List<Map<String, Object>> found = matches(WorldSearch.nearestMatch(settings, graph, request));

		assertFalse(found.isEmpty());
		for (int i = 1; i < found.size(); i++)
		{
			assertTrue(number(found.get(i - 1), "distance") <= number(found.get(i), "distance"), "Nearest first");
		}

		for (int i = 0; i < found.size(); i++)
		{
			for (int j = i + 1; j < found.size(); j++)
			{
				Point a = new Point(number(found.get(i), "x"), number(found.get(i), "y"));
				Point b = new Point(number(found.get(j), "x"), number(found.get(j), "y"));
				assertTrue(a.distanceTo(b) >= WorldSearch.DEFAULT_SPACING, "Three answers should be three stretches of coast, not three cells of one beach");
			}
		}
	}

	@Test
	public void everyAnswerSaysWhichWayItLies()
	{
		WorldSearch.MatchRequest request = from(inlandCenter());
		request.coast = true;
		request.limit = 2;

		for (Map<String, Object> match : matches(WorldSearch.nearestMatch(settings, graph, request)))
		{
			assertTrue(COMPASS.contains(String.valueOf(match.get("direction"))), "Direction must be a compass point: " + match.get("direction"));
		}
	}

	@Test
	public void canSearchForLandTerrainOrForWater()
	{
		WorldSearch.MatchRequest forest = from(inlandCenter());
		forest.terrain = List.of("Forest");
		forest.limit = 1;
		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, forest);
		assertEquals(Boolean.TRUE, answer.get("success"));
		if (!matches(answer).isEmpty())
		{
			assertEquals("forest", matches(answer).get(0).get("terrain"));
		}

		WorldSearch.MatchRequest ocean = from(inlandCenter());
		ocean.terrain = List.of("ocean");
		ocean.limit = 1;
		answer = WorldSearch.nearestMatch(settings, graph, ocean);
		assertEquals(Boolean.TRUE, answer.get("success"));
		if (!matches(answer).isEmpty())
		{
			assertEquals("ocean", matches(answer).get(0).get("terrain"));
		}
	}

	@Test
	public void everyAnswerCarriesTheRegionItIsInAndTheNearestNamedPlace()
	{
		settings.edits.text = new CopyOnWriteArrayList<>(List.of(place("Harbour End", inlandCenter())));

		WorldSearch.MatchRequest request = from(inlandCenter());
		request.coast = true;
		request.limit = 1;

		Map<String, Object> match = matches(WorldSearch.nearestMatch(settings, graph, request)).get(0);

		assertNotNull(match.get("region"), "A point on the map is in a region");
		assertNotNull(match.get("nearestPlace"), "A caller needs to know what the nearest name to the ground is");
		assertEquals("Harbour End", ((Map<?, ?>) match.get("nearestPlace")).get("name"));
	}

	@Test
	public void anUnknownTerrainIsRefusedWithTheVocabularyThatWouldHaveWorked()
	{
		WorldSearch.MatchRequest request = from(inlandCenter());
		request.terrain = List.of("swamp");

		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, request);

		assertEquals(Boolean.FALSE, answer.get("success"));
		assertTrue(String.valueOf(answer.get("message")).contains("swamp"));
		@SuppressWarnings("unchecked")
		List<String> available = (List<String>) answer.get("availableTerrain");
		assertTrue(available.contains("forest") && available.contains("ocean"));
	}

	@Test
	public void aRequestThatNamesNothingToLookForIsRefused()
	{
		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, from(inlandCenter()));

		assertEquals(Boolean.FALSE, answer.get("success"));
		assertNotNull(answer.get("message"));
	}

	@Test
	public void aRequestWithNoPointToSearchFromListsThePlacesItCouldHaveNamed()
	{
		WorldSearch.MatchRequest request = new WorldSearch.MatchRequest();
		request.coast = true;

		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, request);

		assertEquals(Boolean.FALSE, answer.get("success"));
		assertNotNull(answer.get("availablePlaces"));
	}

	@Test
	public void aSearchCanStartFromANamedPlace()
	{
		Center inland = inlandCenter();
		settings.edits.text = new CopyOnWriteArrayList<>(List.of(place("Saltmarsh Cross", inland)));

		WorldSearch.MatchRequest request = new WorldSearch.MatchRequest();
		RouteModel.Endpoint endpoint = new RouteModel.Endpoint();
		endpoint.name = "saltmarsh cross";
		request.from = endpoint;
		request.coast = true;
		request.limit = 1;

		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, request);

		assertEquals(Boolean.TRUE, answer.get("success"), "Place names resolve case-insensitively");
		assertEquals(1, matches(answer).size());
	}

	@Test
	public void maxDistanceBoundsTheSearchInsteadOfReportingAFarAwayAnswer()
	{
		WorldSearch.MatchRequest request = from(inlandCenter());
		request.coast = true;
		request.maxDistance = 0.5;

		Map<String, Object> answer = WorldSearch.nearestMatch(settings, graph, request);

		assertEquals(Boolean.TRUE, answer.get("success"), "Finding nothing is an answer, not an error");
		assertEquals(0, matches(answer).size());
		assertEquals(0, ((Number) answer.get("totalMatches")).intValue());
	}

	@Test
	public void thePointQueryReportsTheGroundThePartyIsStandingOn()
	{
		Center inland = inlandCenter();

		RouteModel.PointRequest point = new RouteModel.PointRequest();
		point.x = inland.loc.x / settings.resolution;
		point.y = inland.loc.y / settings.resolution;

		Map<String, Object> answer = RouteModel.nearest(settings, graph, point);

		assertEquals(Boolean.TRUE, answer.get("success"));
		@SuppressWarnings("unchecked")
		Map<String, Object> ground = (Map<String, Object>) answer.get("surroundings");
		assertNotNull(ground, "A point on the map has ground, and it is what tells a caller whether there is a beach here");
		assertEquals(Boolean.FALSE, ground.get("coastal"), "This point was chosen inland, so it is not on the coast");
	}

	private static Center centerAt(Map<String, Object> match)
	{
		Point at = new Point(number(match, "x") * settings.resolution, number(match, "y") * settings.resolution);
		return graph.findClosestCenter(at, false);
	}

	private static MapText place(String name, Center center)
	{
		Point at = new Point(center.loc.x / settings.resolution, center.loc.y / settings.resolution);
		return new MapText(name, at, 0.0, TextType.City, null, null, null, 0.0, 0, null, 0.0);
	}
}

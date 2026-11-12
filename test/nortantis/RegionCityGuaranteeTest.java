package nortantis;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings.LineStyle;
import nortantis.editor.MapEdits;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;
import java.util.Random;

/**
 * A realm with no town on it is a realm the table cannot name, travel to or rule from, and city placement is a probability over the whole
 * map: a small, remote or mountainous region could come out with none. These tests drive the drawer with city probability zero, so the
 * guarantee alone has to put a settlement in every region.
 */
public class RegionCityGuaranteeTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	@BeforeAll
	public static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();
	}

	private static MapSettings loadSettings(double cityProbability)
	{
		MapSettings settings = new MapSettings(settingsPath);
		settings.resolution = 1.0;
		settings.cityProbability = cityProbability;
		settings.edits = new MapEdits();
		return settings;
	}

	private static WorldGraph buildGraph(long seed)
	{
		Random r = new Random(seed);
		return GraphCreator.createGraph(1200, 900, 4000, 0.5, 0.5, r, 1.0, LineStyle.SplinesWithSmoothedCoastlines, 1.0, true, 2.0, true, 0, false, false, LandShape.Continents, 12);
	}

	private static void drawCitiesWithoutAnyProbabilisticCity(WorldGraph graph, MapSettings settings)
	{
		IconDrawer drawer = new IconDrawer(graph, new Random(424242L), settings);
		drawer.markMountains();
		drawer.markHills();
		drawer.markCities(0.0);
		drawer.addOrUnmarkCities();
	}

	@Test
	public void everyRegionGetsACityWhenTheProbabilityPlacesNone()
	{
		MapSettings settings = loadSettings(0.0);
		WorldGraph graph = buildGraph(8675309L);

		drawCitiesWithoutAnyProbabilisticCity(graph, settings);

		assertFalse(graph.regions.isEmpty(), "the graph should have political regions to check");
		for (Region region : graph.regions.values())
		{
			assertTrue(region.getCenters().stream().anyMatch(c -> c.isCity), "region " + region.id + " has no city");
		}
	}

	@Test
	public void theGuaranteeAddsExactlyOneCityPerEmptyRegion()
	{
		MapSettings settings = loadSettings(0.0);
		WorldGraph graph = buildGraph(20260101L);

		long regions = graph.regions.size();
		long cities = graph.centers.stream().filter(c -> c.isCity).count();

		drawCitiesWithoutAnyProbabilisticCity(graph, settings);

		assertEquals(regions, graph.centers.stream().filter(c -> c.isCity).count(), "one town per realm, none doubled up");
		assertEquals(0, cities, "the probability pass placed none, so every city is the guarantee's");
	}

	@Test
	public void aRealmThatAlreadyHasATownKeepsItAsItIs()
	{
		MapSettings settings = loadSettings(0.0);
		WorldGraph graph = buildGraph(987654321L);

		assertFalse(graph.regions.isEmpty(), "the graph should have political regions to check");
		Region first = graph.regions.values().iterator().next();
		if (first.getCenters().isEmpty())
		{
			return;
		}
		first.getCenters().iterator().next().isCity = true;
		long before = graph.centers.stream().filter(c -> c.isCity).count();

		drawCitiesWithoutAnyProbabilisticCity(graph, settings);

		long inFirst = first.getCenters().stream().filter(c -> c.isCity).count();
		assertEquals(1, inFirst, "a region that already has a town is not given a second one");
		assertTrue(graph.centers.stream().filter(c -> c.isCity).count() >= before);
	}
}

package nortantis.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.WorldGraph;
import nortantis.editor.MapEdits;
import nortantis.editor.MapParts;
import nortantis.graph.voronoi.Center;
import nortantis.platform.Image;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

/**
 * The query endpoints rebuild a world's graph from the settings the caller sends instead of rendering it again. That rebuild has to be
 * faithful, or a route answered from a rebuilt graph would disagree with the map the caller is showing.
 */
public class MapApiServerGraphRebuildTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	private static MapSettings settings;

	@BeforeAll
	public static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();

		settings = new MapSettings(settingsPath);
		settings.resolution = 1.0;
		settings.edits = new MapEdits();
	}

	/**
	 * Renders the world and keeps its graph, which is the graph the query endpoints answered from when they cached rendered worlds.
	 */
	private static WorldGraph renderGraph(MapSettings mapSettings)
	{
		MapParts mapParts = new MapParts();
		Image image = new MapCreator().createMap(mapSettings, null, mapParts);
		image.close();
		assertNotNull(mapParts.graph, "the renderer did not keep its graph");
		return mapParts.graph;
	}

	private static boolean isMountainOrHill(Center center)
	{
		return center.isMountain || center.isHill;
	}

	private static int countMountainsAndHills(WorldGraph graph)
	{
		int count = 0;
		for (Center center : graph.centers)
		{
			if (isMountainOrHill(center))
			{
				count++;
			}
		}
		return count;
	}

	/**
	 * Everything a rebuilt graph has to agree on for a route to mean the same thing: the layout, the biome each centre carries, and its
	 * elevation, since terrain cost is derived from those.
	 */
	private static void assertSameWorld(WorldGraph expected, WorldGraph actual)
	{
		assertEquals(expected.centers.size(), actual.centers.size(), "center count");
		assertEquals(expected.regions.size(), actual.regions.size(), "region count");
		for (int i = 0; i < expected.centers.size(); i++)
		{
			Center expectedCenter = expected.centers.get(i);
			Center actualCenter = actual.centers.get(i);
			assertEquals(expectedCenter.loc.x, actualCenter.loc.x, 1e-9, "center " + i + " x");
			assertEquals(expectedCenter.loc.y, actualCenter.loc.y, 1e-9, "center " + i + " y");
			assertEquals(expectedCenter.biome, actualCenter.biome, "center " + i + " biome");
			assertEquals(expectedCenter.isWater, actualCenter.isWater, "center " + i + " water");
			assertEquals(expectedCenter.elevation, actualCenter.elevation, 1e-9, "center " + i + " elevation");
		}
	}

	@Test
	public void rebuiltGraphMatchesTheRenderedWorld()
	{
		WorldGraph rendered = renderGraph(settings.deepCopy());
		WorldGraph rebuilt = MapApiServer.buildGraphOnly(settings.deepCopy());

		assertSameWorld(rendered, rebuilt);
	}

	/**
	 * Mountains and hills are marked while the renderer places icons, so a graph that was never drawn has none at all. Terrain cost depends
	 * on them, so a rebuild that skipped marking answered routes across a world with no mountains - which made the same route come out 1.8%
	 * longer from a rebuild than from the rendered world.
	 *
	 * The renderer also clears the flag on centres whose icon could not be drawn, so the rebuild may mark more than the renderer keeps, but
	 * never fewer: a centre the renderer treats as a mountain must be one the rebuild treats as a mountain too.
	 */
	@Test
	public void rebuiltGraphMarksEveryMountainTheRendererKept()
	{
		WorldGraph rendered = renderGraph(settings.deepCopy());
		WorldGraph rebuilt = MapApiServer.buildGraphOnly(settings.deepCopy());

		assertTrue(countMountainsAndHills(rendered) > 0, "the fixture draws no mountains or hills, so this test cannot prove they are marked");
		assertTrue(countMountainsAndHills(rebuilt) > 0, "the rebuilt graph marked no mountains or hills");

		List<Integer> missedByRebuild = new ArrayList<>();
		for (int i = 0; i < rendered.centers.size(); i++)
		{
			if (isMountainOrHill(rendered.centers.get(i)) && !isMountainOrHill(rebuilt.centers.get(i)))
			{
				missedByRebuild.add(i);
			}
		}

		assertEquals(List.of(), missedByRebuild, "centres the renderer marked as mountain or hill that the rebuild did not");
	}

	/**
	 * The endpoints are stateless, so the same settings have to keep producing the same world. Otherwise the same question would get
	 * different answers over time, which is exactly what a caller holding its own copy of the world cannot tolerate.
	 */
	@Test
	public void rebuildIsRepeatable()
	{
		WorldGraph first = MapApiServer.buildGraphOnly(settings.deepCopy());
		WorldGraph second = MapApiServer.buildGraphOnly(settings.deepCopy());

		assertSameWorld(first, second);
		assertEquals(countMountainsAndHills(first), countMountainsAndHills(second), "mountains and hills");
	}
}

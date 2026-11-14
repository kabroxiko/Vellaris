package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.WorldGraph;
import nortantis.editor.MapEdits;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Covers the coarse terrain picture a world carries, which is how a reader that only receives the world description can tell where the sea
 * is without turning the map into data it can never read.
 */
public class TerrainGridTest
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

	@SuppressWarnings("unchecked")
	private static List<String> lines(Map<String, Object> grid)
	{
		return (List<String>) grid.get("map");
	}

	@SuppressWarnings("unchecked")
	private static Map<String, String> legend(Map<String, Object> grid)
	{
		return (Map<String, String>) grid.get("legend");
	}

	private static int columns(Map<String, Object> grid)
	{
		return ((Number) grid.get("columns")).intValue();
	}

	private static int rows(Map<String, Object> grid)
	{
		return ((Number) grid.get("rows")).intValue();
	}

	@Test
	public void gridIsARectangleWhoseEveryCharacterIsInTheLegend()
	{
		Map<String, Object> grid = TerrainGrid.build(settings, graph);

		assertNotNull(grid, "A generated world must produce a terrain grid");
		assertTrue(columns(grid) > 1 && rows(grid) > 1);
		assertEquals(rows(grid), lines(grid).size(), "One line per row");

		Map<String, String> legend = legend(grid);
		Set<Character> found = new HashSet<>();
		for (String line : lines(grid))
		{
			assertEquals(columns(grid), line.length(), "Every row is the same width");
			for (char cell : line.toCharArray())
			{
				assertTrue(legend.containsKey(String.valueOf(cell)), "Every reported character is explained: " + cell);
				found.add(cell);
			}
		}

		assertTrue(found.contains(TerrainType.OCEAN.code), "A world with water must show water");
		assertTrue(found.stream().anyMatch(Character::isLowerCase), "A world with land must show land");
	}

	/**
	 * The grid is a summary, so every cell has to be the truth about its own centre. A cell that disagrees with the graph is a coastline
	 * drawn in the wrong place, which is worse than no picture at all.
	 */
	@Test
	public void everyCellReportsTheGroundAtItsCentre()
	{
		Map<String, Object> grid = TerrainGrid.build(settings, graph);
		double cellWidth = ((Number) grid.get("cellWidth")).doubleValue();
		double cellHeight = ((Number) grid.get("cellHeight")).doubleValue();
		double resolution = settings.resolution;

		for (int row = 0; row < rows(grid); row++)
		{
			String line = lines(grid).get(row);
			for (int column = 0; column < columns(grid); column++)
			{
				Point at = new Point((column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
				Center center = graph.findClosestCenter(new Point(at.x * resolution, at.y * resolution), false);
				assertEquals(expectedCode(center), line.charAt(column), "Cell (" + column + ", " + row + ")");
			}
		}
	}

	private static char expectedCode(Center center)
	{
		TerrainType terrain = TerrainType.classify(center);
		if (!terrain.water && TerrainType.isCoastal(center))
		{
			return Character.toUpperCase(terrain.code);
		}
		return terrain.code;
	}

	@Test
	public void coastalLandIsMarkedSoTheShoreCanBeFoundAtAGlance()
	{
		Map<String, Object> grid = TerrainGrid.build(settings, graph);

		boolean anyCoastal = false;
		for (String line : lines(grid))
		{
			for (char cell : line.toCharArray())
			{
				anyCoastal |= Character.isUpperCase(cell);
			}
		}

		assertTrue(anyCoastal, "A world with ocean and land has a coast, and it has to be visible in the grid");
		assertTrue(legend(grid).containsKey(String.valueOf(Character.toUpperCase(TerrainType.PLAINS.code))));
	}

	@Test
	public void gridReportsHowToTurnACellIntoACoordinate()
	{
		Map<String, Object> grid = TerrainGrid.build(settings, graph);

		assertEquals(WorldModel.COORDINATE_SPACE, grid.get("coordinateSpace"));
		assertTrue(((Number) grid.get("cellWidth")).doubleValue() > 0);
		assertTrue(((Number) grid.get("cellHeight")).doubleValue() > 0);
		assertTrue(String.valueOf(grid.get("note")).contains("Row 0"), "The reader has to be told where the grid starts");
	}

	@Test
	public void noGraphMeansNoGridRatherThanAnEmptyOne()
	{
		assertNull(TerrainGrid.build(settings, null));
		assertNull(TerrainGrid.build(null, graph));
	}
}

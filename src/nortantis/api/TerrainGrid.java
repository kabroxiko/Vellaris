package nortantis.api;

import nortantis.MapSettings;
import nortantis.WorldGraph;
import nortantis.graph.voronoi.Center;
import nortantis.geom.Point;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A coarse, text-readable picture of a world's terrain: one character per cell, on a grid fine enough to show where the coast runs and
 * small enough to read in a prompt.
 *
 * This exists because the named places a world reports are a handful of dots, and a reader holding only those dots cannot tell which way
 * the sea lies. Asked to walk to the beach from an inland town, an assistant with no picture of the land has to guess, and guesses "the
 * nearest town that happens to be on a coast" - a place that may be nowhere near the water. The grid answers the shape question directly: a
 * few thousand characters instead of the tens of thousands of index-keyed Voronoi cells an editor document carries.
 *
 * It is deliberately free of any game vocabulary. It reports terrain, water and coastline in the world's own resolution-invariant units, so
 * it describes a map and says nothing about what a client does with one.
 *
 * A capital letter means the same terrain on the coast, so a reader looking for the nearest shore scans for capitals instead of comparing
 * every land cell against every water cell. Both are given because the distinction is cheap to produce here and expensive to get right by
 * inspection.
 */
public final class TerrainGrid
{
	/**
	 * Roughly how many cells the grid should have. Enough for the coastline of a continent to be legible, few enough that the whole picture
	 * stays a couple of thousand tokens.
	 */
	public static final int TARGET_CELL_COUNT = 6000;

	/** Bounds on the grid's width, so a very wide or very tall world still produces something readable. */
	public static final int MIN_COLUMNS = 16;
	public static final int MAX_COLUMNS = 120;

	private TerrainGrid()
	{
		// Static helpers only.
	}

	/**
	 * Builds the grid for a generated world, or returns null when there is no graph to read it from.
	 *
	 * @param settings
	 *            Settings the graph was generated from. Their resolution converts the render's pixel dimensions into the coordinate space
	 *            the rest of the world description uses.
	 * @param graph
	 *            The generated graph. Null, or a graph with no cells, means the world has no ground to draw.
	 */
	public static Map<String, Object> build(MapSettings settings, WorldGraph graph)
	{
		if (settings == null || graph == null || graph.centers == null || graph.centers.isEmpty())
		{
			return null;
		}

		double resolution = settings.resolution <= 0 ? 1.0 : settings.resolution;
		double width = settings.generatedWidth > 0 ? settings.generatedWidth : graph.getWidth();
		double height = settings.generatedHeight > 0 ? settings.generatedHeight : graph.getHeight();
		if (width <= 0 || height <= 0)
		{
			return null;
		}
		width /= resolution;
		height /= resolution;

		int columns = columnCount(width, height);
		// The reported cell size is the one the cells are sampled at, so a client that converts a cell to a coordinate with the numbers
		// this answer gives it lands on the same ground the character it read stands for.
		double cellWidth = round(width / columns);
		int rows = Math.max(1, (int) Math.round(height / cellWidth));
		double cellHeight = round(height / rows);

		List<String> lines = new ArrayList<>(rows);
		for (int row = 0; row < rows; row++)
		{
			StringBuilder line = new StringBuilder(columns);
			for (int column = 0; column < columns; column++)
			{
				Point at = new Point((column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
				Center center = graph.findClosestCenter(new Point(at.x * resolution, at.y * resolution), false);
				line.append(codeFor(center));
			}
			lines.add(line.toString());
		}

		Map<String, Object> grid = new LinkedHashMap<>();
		grid.put("coordinateSpace", WorldModel.COORDINATE_SPACE);
		grid.put("columns", columns);
		grid.put("rows", rows);
		grid.put("cellWidth", cellWidth);
		grid.put("cellHeight", cellHeight);
		grid.put("legend", legend());
		grid.put("map", lines);
		grid.put("note",
				"Row 0 is the north edge and column 0 the west edge. The cell at (column, row) centres on " + "((column + 0.5) * cellWidth, (row + 0.5) * cellHeight) in " + WorldModel.COORDINATE_SPACE
						+ " units. A capital letter is land that touches the sea, so the coast is wherever a capital meets '" + TerrainType.OCEAN.code + "' or a lower-case land letter meets it.");
		return grid;
	}

	/**
	 * The number of columns, chosen so the grid has about {@link #TARGET_CELL_COUNT} cells at the world's aspect ratio.
	 *
	 * The aspect ratio is respected rather than fixed, because a stretched grid distorts the one thing it exists to show: which direction
	 * the water is.
	 */
	private static int columnCount(double width, double height)
	{
		double cellSize = Math.sqrt(width * height / TARGET_CELL_COUNT);
		int columns = (int) Math.round(width / cellSize);
		return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, columns));
	}

	/**
	 * The character for one sampled cell. A cell with no centre at all is reported as '?' rather than as land, so a gap in the grid reads
	 * as a gap instead of as geography.
	 */
	private static char codeFor(Center center)
	{
		if (center == null)
		{
			return '?';
		}
		TerrainType terrain = TerrainType.classify(center);
		char code = terrain.code;
		if (!terrain.water && TerrainType.isCoastal(center))
		{
			return Character.toUpperCase(code);
		}
		return code;
	}

	/**
	 * Every character the grid can contain, with the ground it stands for. Both cases are listed so a reader never has to infer the capital
	 * rule to decode a single cell.
	 */
	private static Map<String, Object> legend()
	{
		Map<String, Object> legend = new LinkedHashMap<>();
		for (TerrainType terrain : TerrainType.values())
		{
			legend.put(String.valueOf(terrain.code), terrain.label);
		}
		for (TerrainType terrain : TerrainType.values())
		{
			if (!terrain.water)
			{
				legend.put(String.valueOf(Character.toUpperCase(terrain.code)), "coastal " + terrain.label);
			}
		}
		legend.put("?", "unreadable cell");
		return legend;
	}

	private static double round(double value)
	{
		return Math.round(value * 100.0) / 100.0;
	}
}

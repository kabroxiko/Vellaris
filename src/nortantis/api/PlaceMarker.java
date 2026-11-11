package nortantis.api;

import nortantis.IconType;
import nortantis.LineBreak;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.TextType;
import nortantis.WorldGraph;
import nortantis.editor.FreeIcon;
import nortantis.geom.Point;
import nortantis.graph.voronoi.Center;
import nortantis.util.Assets;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Adds named places to a generated world after the fact, so a story can mark a site the players must be able to find.
 *
 * A place is a label in the world's own text edits plus the marker icon above it; nothing else about the world changes, and because the
 * seeds are untouched the rest of the map renders exactly as it did before. This is the one write a generated world accepts: its places are
 * what the story needs, while its geography is what the seeds decided.
 */
public final class PlaceMarker
{
	/** A place a caller wants marked: a name and a point in the world's resolution-invariant coordinate space. */
	public static final class Mark
	{
		/** Public and non-final so the JSON body binds straight to it. */
		public String name;
		public Double x;
		public Double y;

		public Mark()
		{
		}

		public Mark(String name, double x, double y)
		{
			this.name = name;
			this.x = x;
			this.y = y;
		}
	}

	/** Longest name a marked place may carry; past this it cannot fit a label and is almost certainly a mistake. */
	public static final int MAX_PLACE_NAME_LENGTH = 80;

	/** Where the marker drawn beside a new place comes from: a cross in the installed pack's decoration group. */
	public static final String MARKER_ART_PACK = Assets.installedArtPack;
	public static final String MARKER_GROUP = "other";
	public static final String MARKER_ICON = "x marker 1";
	/** The marker is drawn a little larger than its file size, so a site stays visible among the settlement labels. */
	public static final double MARKER_SCALE = 1.3;

	/** How far above its label the marker floats, in resolution-invariant units. */
	public static final double MARKER_RISE = 46.0;

	/**
	 * How far, in image pixels, a mark asked for in water may be moved to reach land. A point further out than this is not a coastal
	 * mistake but a coordinate naming open sea, and is refused instead of being dragged onto the nearest island.
	 */
	public static final double SNAP_MAX_DISTANCE = 120.0;

	private PlaceMarker()
	{
		// Static helpers only.
	}

	/**
	 * Returns "" when every mark can be drawn on this world, or the reason the request must be refused.
	 *
	 * Coordinates live in the world's resolution-invariant space, whose extent is the rendered size divided by the resolution, so an entry
	 * outside it would draw nothing and silently vanish. A world that does not say how large it renders cannot be checked and is accepted.
	 */
	public static String positionProblem(MapSettings settings, List<Mark> marks)
	{
		if (settings.edits == null || settings.edits.text == null || settings.edits.text.isEmpty())
		{
			return "These settings describe no generated world: a world with place names is needed to mark a place on.";
		}
		if (settings.edits.freeIcons == null)
		{
			return "These settings describe no generated world: the edit state needed to draw a marker is missing.";
		}

		double maxX = maxX(settings);
		double maxY = maxY(settings);
		for (Mark mark : marks)
		{
			if (mark == null || mark.x == null || mark.y == null || !Double.isFinite(mark.x) || !Double.isFinite(mark.y))
			{
				return "Every place needs a name, an x and a y.";
			}
			if (mark.x < 0 || mark.y < 0 || (maxX > 0 && mark.x > maxX) || (maxY > 0 && mark.y > maxY))
			{
				return String.format(Locale.ROOT, "A place at %.1f, %.1f is outside the map, whose coordinates run from 0, 0 to %.1f, %.1f.", mark.x, mark.y, maxX, maxY);
			}
		}
		return "";
	}

	/** The largest x the world's coordinate space holds, or 0 when the settings do not pin a rendered size. */
	public static double maxX(MapSettings settings)
	{
		return settings.generatedWidth > 0 && settings.resolution > 0 ? settings.generatedWidth / settings.resolution : 0;
	}

	/** The largest y the world's coordinate space holds, or 0 when the settings do not pin a rendered size. */
	public static double maxY(MapSettings settings)
	{
		return settings.generatedHeight > 0 && settings.resolution > 0 ? settings.generatedHeight / settings.resolution : 0;
	}

	/**
	 * Moves each requested mark onto the nearest land cell and records the coordinates it settled on.
	 *
	 * A caller names a point, not a cell, and nothing outside this service knows where the coastline runs, so a mark asked for just off a
	 * harbour town would otherwise label open water. A mark more than {@link #SNAP_MAX_DISTANCE} pixels from land is refused: that is a
	 * coordinate naming the sea rather than a near miss on a coast.
	 *
	 * Returns "" when every mark could be placed, or the reason the request must be refused.
	 */
	public static String snapToLand(MapSettings settings, List<Mark> marks)
	{
		WorldGraph graph;
		try
		{
			// Build the same graph the renderer will build. Replaying this world's edits is what decides where its coast runs, so a probe
			// that regenerated the world instead would judge land and water against a different coastline than the one drawn.
			graph = MapCreator.createGraph(settings, !settings.edits.isInitialized());
		}
		catch (RuntimeException e)
		{
			return "The world could not be rebuilt to place the new marks: " + ApiUtils.formatExceptionMessage(e);
		}

		double resolution = settings.resolution > 0 ? settings.resolution : 1.0;
		for (Mark mark : marks)
		{
			Point graphPoint = new Point(mark.x * resolution, mark.y * resolution);
			Center land = nearestLandCenter(graph, graphPoint);
			if (land == null)
			{
				return "This world has no land, so nothing can be marked on it.";
			}

			double distance = land.loc.distanceTo(graphPoint);
			if (distance > SNAP_MAX_DISTANCE)
			{
				return String.format(Locale.ROOT, "\"%s\" at %.1f, %.1f is %.0f pixels from the nearest land, so it names open water. Place it within %.0f pixels of a coast.", mark.name, mark.x,
						mark.y, distance, SNAP_MAX_DISTANCE);
			}

			mark.x = land.loc.x / resolution;
			mark.y = land.loc.y / resolution;
		}
		return "";
	}

	/** The land cell closest to a point, skipping ocean and lakes, or null when the world has no land at all. */
	private static Center nearestLandCenter(WorldGraph graph, Point graphPoint)
	{
		Center closest = null;
		double closestDistance = Double.MAX_VALUE;
		for (Center center : graph.centers)
		{
			if (center == null || center.isWater || center.isLake)
			{
				continue;
			}
			double distance = center.loc.distanceTo(graphPoint);
			if (distance < closestDistance)
			{
				closestDistance = distance;
				closest = center;
			}
		}
		return closest;
	}

	/**
	 * Appends each place to the world's text edits with the marker icon above it, and returns the names it actually added.
	 *
	 * A name already on the map is skipped rather than added twice: the story may reach for the same cave more than once, and a world
	 * reports names rather than ids to match them by.
	 */
	public static List<String> add(MapSettings settings, List<Mark> marks)
	{
		List<String> added = new ArrayList<>();
		Set<String> known = new HashSet<>();
		for (MapText existing : settings.edits.text)
		{
			if (existing != null && existing.value != null)
			{
				known.add(normalizeName(existing.value));
			}
		}

		for (Mark mark : marks)
		{
			String name = mark == null || mark.name == null ? "" : mark.name.trim();
			if (name.isEmpty() || name.length() > MAX_PLACE_NAME_LENGTH || !known.add(normalizeName(name)))
			{
				continue;
			}

			Point location = new Point(mark.x, mark.y);
			settings.edits.text.add(new MapText(name, location, 0.0, TextType.Landmark, LineBreak.Auto, null, null, 0.0, 0, null, MapText.defaultBackgroundFade));
			// The marker sits above the label so the name stays readable and the two never cover each other.
			settings.edits.freeIcons.addOrReplace(markerFor(location));
			added.add(name);
		}

		if (!added.isEmpty())
		{
			// The icons are described by the edits from here on, so a regeneration must not invent its own set over the top of them.
			settings.edits.hasIconEdits = true;
		}
		return added;
	}

	/** The marker icon that floats above a place's label. */
	private static FreeIcon markerFor(Point labelLocation)
	{
		Point markerLocation = new Point(labelLocation.x, labelLocation.y - MARKER_RISE);
		return new FreeIcon(markerLocation, MARKER_SCALE, IconType.decorations, MARKER_ART_PACK, MARKER_GROUP, -1, MARKER_ICON, null, 0.0, MapSettings.defaultIconFillColor,
				MapSettings.defaultIconFilterColor, false, false, MARKER_SCALE);
	}

	/** Compares place names the way a reader does, so "Cave of the Red Dragon" and "cave of the red dragon" are one place. */
	static String normalizeName(String name)
	{
		return name == null ? "" : name.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
	}
}

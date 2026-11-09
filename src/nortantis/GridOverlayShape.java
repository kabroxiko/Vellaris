package nortantis;

import nortantis.i18n.Translation;

public enum GridOverlayShape
{
	Horizontal_hexes, Vertical_hexes, Squares, Voronoi_polygons;

	public String toString()
	{
		return Translation.get("GridOverlayShape." + name());
	}
}

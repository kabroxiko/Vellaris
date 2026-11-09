package nortantis;

import nortantis.i18n.Translation;

public enum StrokeType
{
	Solid, Dashes, Rounded_Dashes, Dots;

	@Override
	public String toString()
	{
		return Translation.get("StrokeType." + name());
	}
}

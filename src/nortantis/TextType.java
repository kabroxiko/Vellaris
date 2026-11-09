package nortantis;

import nortantis.i18n.Translation;

public enum TextType
{
	Title, Region, Mountain_range, Other_mountains, City, Lake, River;

	public String toString()
	{
		return Translation.get("TextType." + name());
	}
}

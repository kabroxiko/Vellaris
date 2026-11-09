package nortantis;

import nortantis.i18n.Translation;

public enum BorderColorOption
{
	Ocean_color, Choose_color;

	public String toString()
	{
		return Translation.get("BorderColorOption." + name());
	}
}

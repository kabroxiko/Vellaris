package nortantis;

import nortantis.i18n.Translation;

public enum LandShape
{
	Continents, Inland_Sea, Scattered;

	public String toString()
	{
		return Translation.get("LandShape." + name());
	}
}

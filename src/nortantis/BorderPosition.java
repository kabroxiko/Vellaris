package nortantis;

import nortantis.i18n.Translation;

public enum BorderPosition
{
	Outside_map, Over_map;

	public String toString()
	{
		return Translation.get("BorderPosition." + name());
	}
}

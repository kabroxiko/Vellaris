package nortantis;

import nortantis.i18n.Translation;

public enum LineBreak
{
	Auto, One_line, Two_lines;

	public String toString()
	{
		return Translation.get("LineBreak." + name());
	}
}

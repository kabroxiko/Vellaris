package nortantis.editor;

import nortantis.i18n.Translation;

public enum DisplayQuality
{
	Very_Low, Low, Medium, High, Ultra;

	public String toString()
	{
		return Translation.get("DisplayQuality." + name());
	}
}

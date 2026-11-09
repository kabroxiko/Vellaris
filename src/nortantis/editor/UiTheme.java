package nortantis.editor;

import nortantis.i18n.Translation;

public enum UiTheme
{
	Dark, Light, System;

	@Override
	public String toString()
	{
		return Translation.get("LookAndFeel." + name());
	}
}

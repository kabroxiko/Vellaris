package nortantis.editor;

import nortantis.i18n.Translation;

public enum ExportAction
{
	SaveToFile, OpenInDefaultImageViewer;

	@Override
	public String toString()
	{
		return Translation.get("ExportAction." + name());
	}
}

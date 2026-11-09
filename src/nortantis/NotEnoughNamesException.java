package nortantis;

import nortantis.i18n.Translation;

@SuppressWarnings("serial")
public class NotEnoughNamesException extends RuntimeException
{
	public NotEnoughNamesException()
	{
	}

	@Override
	public String getMessage()
	{
		return Translation.get("error.notEnoughNames");
	}
}

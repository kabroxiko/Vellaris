package nortantis.util;

import org.apache.commons.lang3.exception.ExceptionUtils;

public class Logger
{
	private Logger()
	{
	}

	public static void println()
	{
		println("");
	}

	public static void printError(String message, Throwable e)
	{
		println(message, true);
		if (e != null)
		{
			println(e.getMessage(), true);
			println(ExceptionUtils.getStackTrace(e), true);
		}
		else
		{
			println("Unable to print the rest of the error message because the exception was null.", true);
		}
	}

	public static void printError(String message)
	{
		println(message, true);
	}


	public static void println(final Object message)
	{
		println(message, false);
	}

	private static void println(final Object message, boolean isError)
	{
		if (isError)
		{
			System.err.println(message);
		}
		else
		{
			System.out.println(message);
		}
	}
}

package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;

/**
 * Covers the query flag that decides whether /api/world also returns the rendered map. Clients pass it as a query parameter, which arrives
 * as an arbitrary string, so the accepted spellings are worth pinning down.
 */
class MapApiServerWorldOptionsTest
{
	private static boolean parseBooleanFlag(String value) throws Exception
	{
		Method method = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("parseBooleanFlag", String.class);
		method.setAccessible(true);
		return (boolean) method.invoke(null, value);
	}

	@Test
	void testIncludeImageAcceptsCommonTruthySpellings() throws Exception
	{
		assertTrue(parseBooleanFlag("true"));
		assertTrue(parseBooleanFlag("TRUE"));
		assertTrue(parseBooleanFlag("True"));
		assertTrue(parseBooleanFlag("1"));
		assertTrue(parseBooleanFlag("yes"));
		assertTrue(parseBooleanFlag(" true "));
	}

	@Test
	void testIncludeImageTreatsEverythingElseAsFalse() throws Exception
	{
		assertFalse(parseBooleanFlag(null), "Omitting the flag must not add an image to the response");
		assertFalse(parseBooleanFlag(""));
		assertFalse(parseBooleanFlag("false"));
		assertFalse(parseBooleanFlag("0"));
		assertFalse(parseBooleanFlag("no"));
		assertFalse(parseBooleanFlag("anything else"));
	}
}

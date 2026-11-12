package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;

class MapApiServerParamsTest
{
	@Test
	void testTryParseJsonObjectInvalidJsonReturnsNull() throws Exception
	{
		// Call static helper statically
		Object result = MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "tryParseJsonObject", new Class<?>[] { String.class }, "}{");
		assertNull(result);
	}

	@Test
	void testTryParseJsonObjectRejectsNonObjectJson() throws Exception
	{
		Object result = MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "tryParseJsonObject", new Class<?>[] { String.class }, "[1, 2]");
		assertNull(result);
	}

	@Test
	void testIsShortSettingsDocument() throws Exception
	{
		// A document Vellaris wrote is a settings document; the short one names only a few choices and has no version.
		Class<?> jsonObjectClass = com.google.gson.JsonObject.class;
		assertEquals(Boolean.TRUE, MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "isShortSettingsDocument", new Class<?>[] { jsonObjectClass }, new com.google.gson.JsonObject()));

		com.google.gson.JsonObject full = new com.google.gson.JsonObject();
		full.addProperty("version", "3.18");
		assertEquals(Boolean.FALSE, MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "isShortSettingsDocument", new Class<?>[] { jsonObjectClass }, full));
	}

	@Test
	void testParamsContainGenerationFields() throws Exception
	{
		Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
		Object params = paramsClass.getDeclaredConstructor().newInstance();

		// Initially should be false
		Boolean initial = (Boolean) MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "paramsContainGenerationFields", new Class<?>[] { paramsClass }, params);
		assertFalse(initial);

		// Set a generation field (language)
		Field lang = paramsClass.getDeclaredField("language");
		lang.setAccessible(true);
		lang.set(params, "en");

		Boolean after = (Boolean) MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "paramsContainGenerationFields", new Class<?>[] { paramsClass }, params);
		assertTrue(after);
	}

	// Small helper to invoke private static methods via reflection more succinctly
	static class MethodInvoker
	{
		static Object invokeStatic(String className, String methodName, Class<?>[] paramTypes, Object... args) throws Exception
		{
			Class<?> c = Class.forName(className);
			java.lang.reflect.Method m = c.getDeclaredMethod(methodName, paramTypes);
			m.setAccessible(true);
			return m.invoke(null, args);
		}

		Object invokeStaticInstance(String className, String methodName, Class<?>[] paramTypes, Object... args) throws Exception
		{
			return invokeStatic(className, methodName, paramTypes, args);
		}
	}
}

package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

class MapApiServerHandleGenerateSettingsTest
{
	@Test
	void testHandleGenerateSettingsSortsBooksAndReturnsJson() throws Exception
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		// Proxy Context that returns a RandomMapParameters body with unsorted books
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final String[] recordedContentType = new String[1];
		InvocationHandler handler = (proxy, method, args) ->
		{
			String name = method.getName();
			if ("body".equals(name) && (args == null || args.length == 0))
			{
				return "{\"books\":[\"z\",\"a\"]}";
			}
			if ("contentType".equals(name) && args != null && args.length == 1)
			{
				recordedContentType[0] = String.valueOf(args[0]);
				return null;
			}
			return null;
		};

		Object ctxProxy = Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { ctxIface }, handler);

		java.lang.reflect.Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("handleGenerateSettings", ctxIface);
		m.setAccessible(true);
		Object result = m.invoke(null, ctxProxy);

		assertNotNull(result);
		String json = String.valueOf(result);
		com.google.gson.Gson g = new com.google.gson.Gson();
		@SuppressWarnings("unchecked")
		java.util.Map<String, Object> map = g.fromJson(json, java.util.Map.class);
		assertNotNull(map);

		@SuppressWarnings("unchecked")
		java.util.List<String> books = (java.util.List<String>) map.get("books");
		assertNotNull(books);
		// Books should be sorted lexicographically: ["a","z"]
		assertTrue(books.size() >= 2);
		assertEquals("a", books.get(0));
		assertEquals("z", books.get(books.size() - 1));

		assertEquals("application/json", recordedContentType[0]);
	}
}

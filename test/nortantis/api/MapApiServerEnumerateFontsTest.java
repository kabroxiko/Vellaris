package nortantis.api;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MapApiServerEnumerateFontsTest
{
	@Test
	void testEnumerateFontsPopulatesFonts() throws Exception
	{
		Class<?> cls = Class.forName("nortantis.api.MapApiServer");
		Method m = cls.getDeclaredMethod("enumerateFonts", Map.class);
		m.setAccessible(true);

		Map<String, Object> options = new LinkedHashMap<>();
		// call the private method
		m.invoke(null, options);

		assertTrue(options.containsKey("fonts"));
		Object fonts = options.get("fonts");
		assertNotNull(fonts);
		assertTrue(fonts instanceof java.util.List);
	}

	@Test
	void testEnumerateFontsHeadlessDoesNotThrow() throws Exception
	{
		String prev = System.getProperty("java.awt.headless");
		try
		{
			System.setProperty("java.awt.headless", "true");

			Class<?> cls = Class.forName("nortantis.api.MapApiServer");
			Method m = cls.getDeclaredMethod("enumerateFonts", Map.class);
			m.setAccessible(true);

			Map<String, Object> options = new LinkedHashMap<>();
			// Should not throw even if headless
			m.invoke(null, options);

			// In headless mode, fonts may be empty or not present; ensure no exception and map exists
			assertNotNull(options);
		}
		finally
		{
			if (prev == null)
				System.clearProperty("java.awt.headless");
			else
				System.setProperty("java.awt.headless", prev);
		}
	}
}

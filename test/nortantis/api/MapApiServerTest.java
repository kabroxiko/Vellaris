package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;

class MapApiServerTest

{

	private Object invokePrivate(String name, Class<?>[] paramTypes, Object... args) throws Exception
	{
		Method m;
		try
		{
			m = ApiUtils.class.getDeclaredMethod(name, paramTypes);
		}
		catch (NoSuchMethodException nsme)
		{
			m = MapApiServer.class.getDeclaredMethod(name, paramTypes);
		}
		m.setAccessible(true);
		return m.invoke(null, args);
	}

	@Test
	void testParseInteger_nullAndValues() throws Exception
	{
		assertNull(invokePrivate("parseInteger", new Class[] { Object.class }, new Object[] { null }));
		Object r1 = invokePrivate("parseInteger", new Class[] { Object.class }, Integer.valueOf(5));
		assertEquals(5, r1);
		Object r2 = invokePrivate("parseInteger", new Class[] { Object.class }, "42");
		assertEquals(42, r2);
		Object r3 = invokePrivate("parseInteger", new Class[] { Object.class }, "not-a-number");
		assertNull(r3);
	}

	@Test
	void testFormatExceptionMessage_behaviour() throws Exception
	{
		Object r0 = invokePrivate("formatExceptionMessage", new Class[] { Exception.class }, new Object[] { null });
		assertEquals("unknown", r0);

		Exception eBlank = new Exception("");
		Object r1 = invokePrivate("formatExceptionMessage", new Class[] { Exception.class }, eBlank);
		assertEquals(Exception.class.getSimpleName(), r1);

		Exception eMsg = new Exception("boom");
		Object r2 = invokePrivate("formatExceptionMessage", new Class[] { Exception.class }, eMsg);
		assertEquals(Exception.class.getSimpleName() + " - boom", r2);
	}

	@Test
	void testSortKeysInObject_sortsMapKeys() throws Exception
	{
		Map<String, Object> src = new LinkedHashMap<>();
		src.put("b", 2);
		src.put("a", 1);
		Object out = invokePrivate("sortKeysInObject", new Class[] { Object.class }, src);
		assertNotNull(out);
		assertTrue(out instanceof Map);
		@SuppressWarnings("unchecked")
		Map<String, Object> m = (Map<String, Object>) out;
		String first = m.keySet().iterator().next();
		assertEquals("a", first);
	}

	@Test
	void testNormalizeNumber_bigDecimalAndDoubles() throws Exception
	{
		java.math.BigDecimal bd = new java.math.BigDecimal("123");
		Object r1 = invokePrivate("normalizeNumber", new Class[] { Number.class }, bd);
		assertEquals(123, r1);

		Double d = Double.valueOf(2.0);
		Object r2 = invokePrivate("normalizeNumber", new Class[] { Number.class }, d);
		assertEquals(2, r2);

		Double d2 = Double.valueOf(2.5);
		Object r3 = invokePrivate("normalizeNumber", new Class[] { Number.class }, d2);
		assertEquals(2.5, r3);
	}

	@Test
	void testNormalizeNumbersInObject_recurses() throws Exception
	{
		Map<String, Object> src = new LinkedHashMap<>();
		src.put("x", Double.valueOf(3.0));
		Object out = invokePrivate("normalizeNumbersInObject", new Class[] { Object.class }, src);
		assertNotNull(out);
		assertTrue(out instanceof Map);
		@SuppressWarnings("unchecked")
		Map<String, Object> m = (Map<String, Object>) out;
		Object v = m.get("x");
		assertEquals(3, v);
	}

	@Test
	void testScaleImageIfNeeded_smallAndLarge() throws Exception
	{
		java.awt.image.BufferedImage small = new java.awt.image.BufferedImage(100, 50, java.awt.image.BufferedImage.TYPE_INT_RGB);
		Object out1 = invokePrivate("scaleImageIfNeeded", new Class[] { java.awt.image.BufferedImage.class }, small);
		assertSame(small, out1);

		java.awt.image.BufferedImage large = new java.awt.image.BufferedImage(4000, 2000, java.awt.image.BufferedImage.TYPE_INT_RGB);
		Object out2 = invokePrivate("scaleImageIfNeeded", new Class[] { java.awt.image.BufferedImage.class }, large);
		assertNotNull(out2);
		assertTrue(out2 instanceof java.awt.image.BufferedImage);
		java.awt.image.BufferedImage scaled = (java.awt.image.BufferedImage) out2;
		assertTrue(scaled.getWidth() <= 1920 && scaled.getHeight() <= 1920);
	}

	@Test
	void testSortBooksListInMap_sortsEntries() throws Exception
	{
		Map<String, Object> m = new LinkedHashMap<>();
		java.util.List<Object> books = new java.util.ArrayList<>();
		books.add("Zeta");
		books.add("Alpha");
		m.put("books", books);
		invokePrivate("sortBooksInObject", new Class[] { Object.class }, m);
		@SuppressWarnings("unchecked")
		java.util.List<Object> out = (java.util.List<Object>) m.get("books");
		assertEquals("Alpha", out.get(0));
		assertEquals("Zeta", out.get(1));
	}

	@Test
	void testTryParseParams_and_paramsContainGenerationFields() throws Exception
	{
		String json = "{\"language\":\"en\", \"worldSize\": 5}";
		Object params = invokePrivate("tryParseParams", new Class[] { String.class }, json);
		assertNotNull(params);
		Object hasFields = invokePrivate("paramsContainGenerationFields", new Class[] { params.getClass() }, params);
		assertEquals(Boolean.TRUE, hasFields);
	}
}

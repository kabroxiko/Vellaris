package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

class ApiUtilsTest
{
	@Test
	void testParseInteger()
	{
		assertNull(ApiUtils.parseInteger(null));
		assertEquals(Integer.valueOf(5), ApiUtils.parseInteger(Integer.valueOf(5)));
		assertEquals(Integer.valueOf(7), ApiUtils.parseInteger("7"));
		assertNull(ApiUtils.parseInteger("abc"));
	}

	@Test
	void testFormatExceptionMessage()
	{
		assertEquals("unknown", ApiUtils.formatExceptionMessage(null));
		Exception e1 = new Exception("boom");
		assertEquals("Exception - boom", ApiUtils.formatExceptionMessage(e1));
		Exception e2 = new Exception();
		assertEquals("Exception", ApiUtils.formatExceptionMessage(e2));
	}

	@Test
	void testSortMapAndKeys()
	{
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("b", 1);
		m.put("a", 2);
		Map<String, Object> sorted = ApiUtils.sortMap(m);
		String firstKey = sorted.keySet().iterator().next();
		assertEquals("a", firstKey);
	}

	@Test
	void testNormalizeNumber()
	{
		Object r1 = ApiUtils.normalizeNumber(new BigDecimal("42"));
		assertTrue(r1 instanceof Integer || r1 instanceof Long);
		assertEquals(42, ((Number) r1).intValue());

		Object r2 = ApiUtils.normalizeNumber(new BigDecimal("1.5"));
		assertTrue(r2 instanceof Double);

		Object r3 = ApiUtils.normalizeNumber(Double.valueOf(3.0));
		assertTrue(r3 instanceof Integer || r3 instanceof Long);
		assertEquals(3, ((Number) r3).intValue());
	}

	@Test
	void testScaleAndSerializeImage() throws Exception
	{
		BufferedImage big = new BufferedImage(3000, 2000, BufferedImage.TYPE_INT_ARGB);
		BufferedImage scaled = ApiUtils.scaleImageIfNeeded(big);
		assertTrue(scaled.getWidth() <= 1920 && scaled.getHeight() <= 1920);

		BufferedImage small = new BufferedImage(100, 100, BufferedImage.TYPE_INT_ARGB);
		byte[] bytes = ApiUtils.serializeImageToBytes(small);
		assertNotNull(bytes);
		assertTrue(bytes.length > 8);
		// PNG signature
		assertEquals((byte) 137, bytes[0]);
		assertEquals((byte) 80, bytes[1]);
		assertEquals((byte) 78, bytes[2]);
		assertEquals((byte) 71, bytes[3]);
	}

	@Test
	void testSortBooksListInMap()
	{
		Map<String, Object> m = new java.util.HashMap<>();
		m.put("books", List.of("z", "a"));
		ApiUtils.sortBooksListInMap(m, "books", m.get("books"));
		@SuppressWarnings("unchecked")
		List<String> lst = (List<String>) m.get("books");
		assertEquals("a", lst.get(0));
		assertEquals("z", lst.get(1));
	}
}

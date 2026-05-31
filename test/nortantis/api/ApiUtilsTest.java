package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import nortantis.MapSettings;
import nortantis.editor.CenterEdit;
import nortantis.NamedResource;
import nortantis.util.Assets;
import nortantis.TextureSource;
import nortantis.GeneratedDimension;

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

	@Test
	void testEnsureIconEditsFlag()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings s = new MapSettings();
		// add a center edit to trigger hasIconEdits
		s.edits.centerEdits.put(0, new CenterEdit(0, false, false, null, null, null));
		ApiUtils.ensureIconEditsFlag(s);
		assertTrue(s.edits.hasIconEdits);
	}

	@Test
	void testApplyRandomMapParameterOverridesAndDimension()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.worldSize = 11;
		p.cityIconSetName = "coolset";
		p.landShape = "Continents";
		p.regionCount = 7;
		p.cityProbability = 0.123;
		p.books = List.of("b", "a");
		p.dimension = "Square";

		MapSettings s = new MapSettings();
		ApiUtils.applyRandomMapParameterOverrides(p, s);
		assertEquals(11, s.worldSize);
		assertEquals("coolset", s.cityIconTypeName);
		assertEquals(nortantis.LandShape.Continents, s.landShape);
		assertEquals(7, s.regionCount);
		assertEquals(0.123, s.cityProbability, 0.0001);
		assertNotNull(s.books);
		// dimension applied from Square preset
		assertEquals(GeneratedDimension.Square.width, s.generatedWidth);
	}

	@Test
	void testDisableTextureAndBorderMethods()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings s = new MapSettings();
		// file texture
		s.backgroundTextureSource = TextureSource.File;
		s.generateBackgroundFromTexture = true;
		ApiUtils.disableFileTextureIfNeeded(s);
		assertFalse(s.generateBackgroundFromTexture);
		assertTrue(s.solidColorBackground);
		assertEquals("", s.backgroundTextureImage);

		// custom texture
		s = new MapSettings();
		s.backgroundTextureResource = new NamedResource(Assets.customArtPack, "foo.png");
		s.generateBackgroundFromTexture = true;
		ApiUtils.disableCustomTextureIfNeeded(s);
		assertFalse(s.generateBackgroundFromTexture);
		assertTrue(s.solidColorBackground);
		assertNull(s.backgroundTextureResource);

		// custom border
		s = new MapSettings();
		s.borderResource = new NamedResource(Assets.customArtPack, "b.png");
		s.drawBorder = true;
		ApiUtils.disableCustomBorderIfNeeded(s);
		assertFalse(s.drawBorder);
		assertNull(s.borderResource);
	}

	@Test
	void testOptionParseAndSortingHelpers()
	{
		Map<String, String> opt = ApiUtils.option("v", "lab");
		assertEquals("v", opt.get("value"));
		assertEquals("lab", opt.get("label"));

		assertEquals(GeneratedDimension.Golden_Ratio, ApiUtils.parseGeneratedDimension("Golden_Ratio"));
		assertNull(ApiUtils.parseGeneratedDimension("NOPE"));

		List<Object> lst = ApiUtils.sortList(List.of(Map.of("b", 2), Map.of("a", 1)));
		assertTrue(lst instanceof List);

		Map<String, Object> nested = new java.util.HashMap<>();
		nested.put("books", List.of("z", "a"));
		ApiUtils.processMapForBooks(nested);
		@SuppressWarnings("unchecked")
		List<String> books = (List<String>) nested.get("books");
		assertEquals("a", books.get(0));
	}

	@Test
	void testNormalizeNumbersAndComputeDimensionsAndErrorMessage()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		Map<String, Object> m = new java.util.HashMap<>();
		m.put("x", new BigDecimal("100"));
		m.put("y", List.of(new BigDecimal("2.0"), 3.0));
		Object norm = ApiUtils.normalizeNumbersInObject(m);
		assertTrue(norm instanceof Map);

		// compute render dims
		MapSettings s = new MapSettings();
		s.generatedWidth = 1111;
		s.generatedHeight = 2222;
		nortantis.geom.Dimension d = ApiUtils.computeRenderDimensionsFromSettings(s, null, null);
		assertEquals(1111, d.width);
		assertEquals(2222, d.height);

		// build error message
		Exception e1 = new Exception("p1");
		Exception e2 = new RuntimeException("p2");
		String msg = ApiUtils.buildErrorMessage(e1, e2);
		assertTrue(msg.contains("RuntimeException") && msg.contains("Exception"));
	}
}

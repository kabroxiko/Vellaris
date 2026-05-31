package nortantis.api;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class MapApiServerTest {

	// Helper to invoke private static methods on MapApiServer
	private Object invokeOnMapApi(String name, Class<?>[] paramTypes, Object... args) throws Exception {
		Method m = MapApiServer.class.getDeclaredMethod(name, paramTypes);
		m.setAccessible(true);
		return m.invoke(null, args);
	}

	@Test
	void testAssembleResultListPlacesCinzelFirstWhenPresent() throws Exception {
		List<String> available = new ArrayList<>();
		available.add("Arial");
		available.add("Cinzel");
		List<String> hardcoded = List.of("Cinzel");

		@SuppressWarnings("unchecked")
		List<String> res = (List<String>) invokeOnMapApi("assembleResultList", new Class[] { List.class, List.class }, available, hardcoded);

		assertEquals("Cinzel", res.get(0));
	}

	@Test
	void testBuildFontsMapProducesEmptyPaths() throws Exception {
		List<String> result = List.of("A", "B", "Cinzel");
		@SuppressWarnings("unchecked")
		Map<String, Object> map = (Map<String, Object>) invokeOnMapApi("buildFontsMap", new Class[] { List.class }, result);

		assertTrue(map.containsKey("A"));
		assertTrue(map.containsKey("Cinzel"));
		assertEquals("", map.get("A"));
	}

	@Test
	void testUpdateFontsMapForBundledReplacesNormalizedKey() throws Exception {
		Map<String, Object> fontsMap = new LinkedHashMap<>();
		fontsMap.put("Cinzel", "");

		invokeOnMapApi("updateFontsMapForBundled", new Class[] { Map.class, String.class, String.class }, fontsMap, "Cinzel Bold", "/fonts/cinzel-bold.ttf");

		assertFalse(fontsMap.containsKey("Cinzel"));
		assertEquals("/fonts/cinzel-bold.ttf", fontsMap.get("Cinzel Bold"));
	}

	@Test
	void testEnsureFamilyAtFrontAddsIfMissing() throws Exception {
		List<String> result = new ArrayList<>();
		result.add("One");
		result.add("Two");

		invokeOnMapApi("ensureFamilyAtFront", new Class[] { List.class, String.class }, result, "Three");

		assertEquals("Three", result.get(0));
		// calling again with existing family should not duplicate
		invokeOnMapApi("ensureFamilyAtFront", new Class[] { List.class, String.class }, result, "Three");
		assertEquals(3, result.size());
	}

	@Test
	void testSafeUrlDecodeDecodes() throws Exception {
		String out = (String) invokeOnMapApi("safeUrlDecode", new Class[] { String.class }, "A%20B.ttf");
		assertEquals("A B.ttf", out);
	}

	@Test
	void testParamsContainGenerationFieldsDetectsCityProbability() throws Exception {
		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.cityProbability = 0.5;

		Boolean b = (Boolean) invokeOnMapApi("paramsContainGenerationFields", new Class[] { ApiUtils.RandomMapParameters.class }, p);
		assertTrue(b);
	}

	// Additional ApiUtils behavior tests via reflection
	@Test
	void testTryParseParams_and_paramsContainGenerationFields() throws Exception {
		String json = "{\"language\":\"en\", \"worldSize\": 5}";
		Method tryParse = MapApiServer.class.getDeclaredMethod("tryParseParams", String.class);
		tryParse.setAccessible(true);
		Object params = tryParse.invoke(null, json);
		assertNotNull(params);

		Method pCheck = MapApiServer.class.getDeclaredMethod("paramsContainGenerationFields", params.getClass());
		pCheck.setAccessible(true);
		Object hasFields = pCheck.invoke(null, params);
		assertEquals(Boolean.TRUE, hasFields);
	}
}

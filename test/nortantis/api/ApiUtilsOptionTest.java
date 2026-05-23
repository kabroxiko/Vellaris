package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;

class ApiUtilsOptionTest
{
	@Test
	void testOptionCreatesMap()
	{
		Map<String, String> m = ApiUtils.option("x", "label");
		assertEquals("x", m.get("value"));
		assertEquals("label", m.get("label"));
	}

	@Test
	void testParseGeneratedDimension()
	{
		nortantis.GeneratedDimension gd = ApiUtils.parseGeneratedDimension("Square");
		assertNotNull(gd);
		assertEquals(nortantis.GeneratedDimension.Square, gd);

		assertNull(ApiUtils.parseGeneratedDimension("Nonexistent"));
		assertNull(ApiUtils.parseGeneratedDimension(null));
	}
}

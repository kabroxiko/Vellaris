package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.geom.Dimension;

class ApiUtilsComputeTest
{
	@Test
	void testComputeRenderDimensions_explicitAndDefault()
	{
		Dimension d1 = ApiUtils.computeRenderDimensions(2000, 1200, null, null);
		assertEquals(2000, d1.width);
		assertEquals(1200, d1.height);

		Dimension d2 = ApiUtils.computeRenderDimensions(2000, 1200, Integer.valueOf(800), null);
		assertEquals(800, d2.width);
		assertEquals(1200, d2.height);

		Dimension d3 = ApiUtils.computeRenderDimensions(2000, 1200, null, Integer.valueOf(600));
		assertEquals(2000, d3.width);
		assertEquals(600, d3.height);
	}

	@Test
	void testBuildErrorMessage_containsBothErrors()
	{
		Exception primary = new Exception("primary-msg");
		Exception fallback = new RuntimeException("fallback-msg");
		String msg = ApiUtils.buildErrorMessage(primary, fallback);
		assertTrue(msg.contains("Failed to generate map:"));
		assertTrue(msg.contains("RuntimeException"));
		assertTrue(msg.contains("fallback-msg"));
		assertTrue(msg.contains("primary-msg"));
	}
}

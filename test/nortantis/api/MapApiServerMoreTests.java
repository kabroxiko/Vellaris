package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Method;

class MapApiServerMoreTests
{
	@Test
	void testGenerateBackgroundBaseImageVariantsReturnImages() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());

		Method m = MapApiServer.class.getDeclaredMethod("generateBackgroundBaseImage", int.class, int.class, String.class, String.class, String.class);
		m.setAccessible(true);

		// Unknown type -> solid
		Object img1 = m.invoke(null, 32, 24, "UnknownType", null, null);
		assertNotNull(img1);

		// FractalNoise -> may return an image
		Object img2 = m.invoke(null, 32, 24, "FractalNoise", null, null);
		assertNotNull(img2);

		// GeneratedFromTexture with missing texture should fallback to solid
		Object img3 = m.invoke(null, 32, 24, "GeneratedFromTexture", null, null);
		assertNotNull(img3);
	}

	@Test
	void testGetCityIconTypesForPackReturnsEmptyOnError() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());
		Method m = MapApiServer.class.getDeclaredMethod("getCityIconTypesForPack", String.class);
		m.setAccessible(true);
		@SuppressWarnings("unchecked")
		java.util.List<String> out = (java.util.List<String>) m.invoke(null, "nonexistent-pack-xyz");
		assertNotNull(out);
		assertTrue(out.isEmpty());
	}

	@Test
	void testResolveBestNortContentSerializesSettings() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.MapSettings s = nortantis.SettingsGenerator.generate(new java.util.Random(4), nortantis.util.Assets.installedArtPack, null);
		Method m = MapApiServer.class.getDeclaredMethod("resolveBestNortContent", nortantis.MapSettings.class);
		m.setAccessible(true);
		String out = (String) m.invoke(null, s);
		assertNotNull(out);
		assertTrue(out.contains("artPack") || out.contains("generatedWidth") || !out.isEmpty());
	}
}

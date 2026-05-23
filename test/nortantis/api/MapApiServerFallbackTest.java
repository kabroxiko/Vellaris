package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;

import nortantis.MapSettings;
import nortantis.util.Assets;

class MapApiServerFallbackTest
{
	@Test
	void testPrepareFallbackSettingsAdjustsCustomPathsAndArtPack() throws Exception
	{
		// Ensure platform is available and install a test translation bundle.
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
		{
			MapSettings s = new MapSettings();
			s.customImagesPath = "some/path";
			s.artPack = Assets.customArtPack;

			Object result = invokePrepareFallback(s);
			assertNotNull(result);
			assertTrue(result instanceof MapSettings);
			MapSettings fb = (MapSettings) result;
			assertEquals("", fb.customImagesPath);
			assertEquals(Assets.installedArtPack, fb.artPack);
		}
	}

	private static Object invokePrepareFallback(MapSettings s) throws Exception
	{
		Class<?> c = Class.forName("nortantis.api.MapApiServer");
		Method m = c.getDeclaredMethod("prepareFallbackSettings", MapSettings.class);
		m.setAccessible(true);
		return m.invoke(null, s);
	}
}

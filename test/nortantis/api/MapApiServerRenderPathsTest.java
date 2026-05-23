package nortantis.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.MapSettings;

class MapApiServerRenderPathsTest
{
	private void installDummyTranslationBundle() throws Exception
	{
		Class<?> trClass = Class.forName("nortantis.swing.translation.Translation");
		java.lang.reflect.Field bundleField = trClass.getDeclaredField("bundle");
		bundleField.setAccessible(true);
		java.util.ResourceBundle fake = new java.util.ResourceBundle()
		{
			@Override
			protected Object handleGetObject(String key)
			{
				return key;
			}

			@Override
			public java.util.Enumeration<String> getKeys()
			{
				return java.util.Collections.enumeration(java.util.List.of());
			}
		};
		bundleField.set(null, fake);
	}

	private AutoCloseable installSuccessMapCreatorFactory()
	{
		return MapApiServerTestHooks.installFactory(() -> new nortantis.MapCreator()
		{
			@Override
			public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
			{
				// Ensure platform factory is available
				nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
				return nortantis.platform.Image.create(16, 16, nortantis.platform.ImageType.ARGB, true);
			}
		});
	}

	private AutoCloseable installFailingMapCreatorFactory()
	{
		return MapApiServerTestHooks.installFactory(() -> new nortantis.MapCreator()
		{
			@Override
			public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
			{
				throw new RuntimeException("simulated render failure");
			}
		});
	}

	@Test
	void testGenerateMapPrimarySuccess() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());
		MapSettings settings = nortantis.SettingsGenerator.generate(new java.util.Random(5), nortantis.util.Assets.installedArtPack, null);
		installDummyTranslationBundle();
		// keep generated size small to keep rendering fast in tests
		settings.generatedWidth = 64;
		settings.generatedHeight = 64;
		try (AutoCloseable h = installSuccessMapCreatorFactory())
		{

			java.lang.reflect.Method m = MapApiServer.class.getDeclaredMethod("generateMap", nortantis.MapSettings.class, Integer.class, Integer.class);
			m.setAccessible(true);
			Object res = m.invoke(null, settings, null, null);
			assertNotNull(res);
			Class<?> resClass = res.getClass();
			java.lang.reflect.Field imgField = resClass.getDeclaredField("image");
			imgField.setAccessible(true);
			Object image = imgField.get(res);
			java.lang.reflect.Field errField = resClass.getDeclaredField("errorMessage");
			errField.setAccessible(true);
			Object err = errField.get(res);
			assertNotNull(image, "Expected successful GenerationResult with image");
			assertNull(err, "Expected no error message on successful primary render");
		}
	}

	@Test
	void testGenerateMapBothFailReturnsFailure() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());
		MapSettings settings = nortantis.SettingsGenerator.generate(new java.util.Random(6), nortantis.util.Assets.installedArtPack, null);
		installDummyTranslationBundle();

		// craft settings with extreme aspect ratio so primary and fallback both fail
		settings.generatedWidth = 100000;
		settings.generatedHeight = 1;
		try (AutoCloseable h = installFailingMapCreatorFactory())
		{

			java.lang.reflect.Method m = MapApiServer.class.getDeclaredMethod("generateMap", nortantis.MapSettings.class, Integer.class, Integer.class);
			m.setAccessible(true);
			Object res = m.invoke(null, settings, null, null);
			assertNotNull(res);
			Class<?> resClass = res.getClass();
			java.lang.reflect.Field imgField = resClass.getDeclaredField("image");
			imgField.setAccessible(true);
			// The aspect ratio scenario should produce an error message
			java.lang.reflect.Field errField = resClass.getDeclaredField("errorMessage");
			errField.setAccessible(true);
			Object err = errField.get(res);
			assertNotNull(err, "Expected error message when both primary and fallback render fail");
			assertTrue(err.toString().toLowerCase().contains("simulated render failure") || err.toString().toLowerCase().contains("aspect") || err.toString().toLowerCase().contains("aspectratio")
					|| err.toString().toLowerCase().contains("aspect_ratio"), "Expected render-related error, got: " + err);
		}

	}

	@AfterEach
	void ensureReset()
	{
		MapApiServerTestHooks.resetMapCreatorFactory();
	}
}

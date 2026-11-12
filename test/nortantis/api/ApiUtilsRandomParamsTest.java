package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;
import nortantis.GeneratedDimension;
import nortantis.TextureSource;

import java.util.List;

class ApiUtilsRandomParamsTest
{
	@Test
	void testApplyDimensionOverride_setsGeneratedSize()
	{
		java.util.Random rand = new java.util.Random(0);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.dimension = "Square";

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(GeneratedDimension.Square.width, settings.generatedWidth);
		assertEquals(GeneratedDimension.Square.height, settings.generatedHeight);
	}

	/**
	 * A caller that shows the map large asks for pixels, not for a preset. The name still sets the shape, so the world is the same
	 * one it would have been; only the picture it is drawn onto is bigger.
	 */
	@Test
	void testExplicitRenderDimensionsWinOverTheNamedDimension()
	{
		java.util.Random rand = new java.util.Random(3);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.dimension = "Sixteen_by_9";
		p.generatedWidth = 6144;
		p.generatedHeight = 3456;

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(6144, settings.generatedWidth);
		assertEquals(3456, settings.generatedHeight);
	}

	@Test
	void testOneExplicitSideKeepsTheDimensionsAspectRatio()
	{
		java.util.Random rand = new java.util.Random(4);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.dimension = "Sixteen_by_9";
		p.generatedWidth = 6144;

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(6144, settings.generatedWidth);
		assertEquals(GeneratedDimension.Sixteen_by_9.height * 6144 / GeneratedDimension.Sixteen_by_9.width, settings.generatedHeight);
	}

	@Test
	void testExplicitRenderDimensionsAreClampedToWhatTheRendererCanServe()
	{
		java.util.Random rand = new java.util.Random(5);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.generatedWidth = 99999;
		p.generatedHeight = 1;

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(ApiUtils.MAX_RENDER_DIMENSION, settings.generatedWidth);
		assertEquals(ApiUtils.MIN_RENDER_DIMENSION, settings.generatedHeight);
	}

	@Test
	void testApplyRandomMapParameterOverrides_cityFrequencyAndBooks()
	{
		java.util.Random rand = new java.util.Random(1);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		// cityFrequency was removed; use cityProbability (fraction)
		p.cityProbability = 0.20;
		p.books = List.of("Alpha", "Beta");

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		double expected = p.cityProbability;
		assertEquals(expected, settings.cityProbability, 1e-9);
		assertNotNull(settings.books);
		assertTrue(settings.books.contains("Alpha"));
		assertTrue(settings.books.contains("Beta"));
	}

	@Test
	void testDisableFileTextureAndCustomBorder()
	{
		java.util.Random rand = new java.util.Random(2);
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = SettingsGenerator.generate(rand, Assets.installedArtPack, null);

		settings.backgroundTextureSource = TextureSource.File;
		settings.backgroundTextureImage = "x.png";

		ApiUtils.disableFileTextureIfNeeded(settings);
		assertFalse(settings.generateBackgroundFromTexture);
		assertTrue(settings.solidColorBackground);
		assertEquals("", settings.backgroundTextureImage);

		// Custom border
		settings.borderResource = new nortantis.NamedResource(Assets.customArtPack, "b");
		ApiUtils.disableCustomBorderIfNeeded(settings);
		assertFalse(settings.drawBorder);
		assertNull(settings.borderResource);
	}
}

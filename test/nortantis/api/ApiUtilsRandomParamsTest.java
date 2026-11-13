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
	void testApplyRandomMapParameterOverrides_pinsConcentricWaves()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = new MapSettings();
		settings.oceanWavesType = MapSettings.OceanWaves.None;
		settings.oceanShadingLevel = 4;
		settings.concentricWaveCount = 0;

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.oceanEffect = "ConcentricWaves";

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(MapSettings.OceanWaves.ConcentricWaves, settings.oceanWavesType);
		assertTrue(settings.hasConcentricWaves());
		assertEquals(SettingsGenerator.minConcentricWaveCountToGenerate, settings.concentricWaveCount);
		// The randomized shading substitutes for waves, so asking for waves drops it.
		assertEquals(0, settings.oceanShadingLevel);
	}

	@Test
	void testApplyRandomMapParameterOverrides_waveTuning()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = new MapSettings();
		settings.oceanWavesType = MapSettings.OceanWaves.ConcentricWaves;
		settings.concentricWaveCount = 2;

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.oceanWavesLevel = 30;
		p.concentricWaveCount = 4;
		p.fadeConcentricWaves = false;
		p.jitterToConcentricWaves = true;
		p.brokenLinesForConcentricWaves = true;

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(30, settings.oceanWavesLevel);
		assertEquals(4, settings.concentricWaveCount);
		assertFalse(settings.fadeConcentricWaves);
		assertTrue(settings.jitterToConcentricWaves);
		assertTrue(settings.brokenLinesForConcentricWaves);
	}

	@Test
	void testApplyRandomMapParameterOverrides_unknownWaveTypeKeepsGeneratedOne()
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		MapSettings settings = new MapSettings();
		settings.oceanWavesType = MapSettings.OceanWaves.ConcentricWaves;

		ApiUtils.RandomMapParameters p = new ApiUtils.RandomMapParameters();
		p.oceanEffect = "NotARealWaveType";

		ApiUtils.applyRandomMapParameterOverrides(p, settings);

		assertEquals(MapSettings.OceanWaves.ConcentricWaves, settings.oceanWavesType);
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

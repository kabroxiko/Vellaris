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
        p.cityFrequency = Integer.valueOf(20);
        p.books = List.of("Alpha", "Beta");

        ApiUtils.applyRandomMapParameterOverrides(p, settings);

        double expected = p.cityFrequency / 100.0 * SettingsGenerator.maxCityProbability;
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

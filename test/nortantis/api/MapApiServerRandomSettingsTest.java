package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;

import nortantis.SettingsGenerator;
import nortantis.MapSettings;
import nortantis.GeneratedDimension;

class MapApiServerRandomSettingsTest
{
    @Test
    void testGenerateRandomMapSettingsAppliesOverrides() throws Exception
    {
        // Create params instance (package-private DTO)
        Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
        Object params = paramsClass.getDeclaredConstructor().newInstance();

        // Set a number of override fields
        Field dimField = paramsClass.getDeclaredField("dimension");
        dimField.setAccessible(true);
        dimField.set(params, "Square");

        Field wsField = paramsClass.getDeclaredField("worldSize");
        wsField.setAccessible(true);
        wsField.set(params, Integer.valueOf(7));

        Field cityIconField = paramsClass.getDeclaredField("cityIconSetName");
        cityIconField.setAccessible(true);
        cityIconField.set(params, "myIcons");

        Field landShapeField = paramsClass.getDeclaredField("landShape");
        landShapeField.setAccessible(true);
        landShapeField.set(params, "Continents");

        Field regionCountField = paramsClass.getDeclaredField("regionCount");
        regionCountField.setAccessible(true);
        regionCountField.set(params, Integer.valueOf(12));

        Field cityFreqField = paramsClass.getDeclaredField("cityFrequency");
        cityFreqField.setAccessible(true);
        cityFreqField.set(params, Integer.valueOf(10));

        Field booksField = paramsClass.getDeclaredField("books");
        booksField.setAccessible(true);
        booksField.set(params, List.of("A", "B"));

        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
        try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
        {
            // bundle installed for the duration of this block
        }

        // Invoke the private helper
        Method m = MapApiServer.class.getDeclaredMethod("generateRandomMapSettings", paramsClass);
        m.setAccessible(true);
        MapSettings settings = (MapSettings) m.invoke(null, params);

        assertNotNull(settings);
        // dimension applied
        assertEquals(GeneratedDimension.Square.width, settings.generatedWidth);
        // worldSize applied
        assertEquals(7, settings.worldSize);
        // city icon name applied
        assertEquals("myIcons", settings.cityIconTypeName);
        // land shape applied
        assertEquals(nortantis.LandShape.Continents, settings.landShape);
        // region count applied
        assertEquals(12, settings.regionCount);
        // city probability computed from cityFrequency
        double expectedCityProb = 10.0 / 100.0 * SettingsGenerator.maxCityProbability;
        assertEquals(expectedCityProb, settings.cityProbability, 1e-12);
        // books set applied
        assertNotNull(settings.books);
        assertTrue(settings.books.contains("A") && settings.books.contains("B"));
    }
}

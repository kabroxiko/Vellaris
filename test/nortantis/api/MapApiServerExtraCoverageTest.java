package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Method;
import java.util.List;

class MapApiServerExtraCoverageTest
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

    @Test
    void testParamsContainGenerationFields() throws Exception
    {
        // ensure platform doesn't cause AWT init errors
        PlatformFactory.setInstance(new AwtFactory());

        // create empty params
        Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
        Object params = paramsClass.getDeclaredConstructor().newInstance();

        Method m = MapApiServer.class.getDeclaredMethod("paramsContainGenerationFields", paramsClass);
        m.setAccessible(true);
        Boolean resEmpty = (Boolean) m.invoke(null, params);
        assertFalse(resEmpty);

        // set a field (cityFrequency) and verify it returns true
        java.lang.reflect.Field f = paramsClass.getDeclaredField("cityFrequency");
        f.setAccessible(true);
        f.set(params, Integer.valueOf(10));
        Boolean resWithCity = (Boolean) m.invoke(null, params);
        assertTrue(resWithCity);

        // set books list
        java.lang.reflect.Field booksField = paramsClass.getDeclaredField("books");
        booksField.setAccessible(true);
        booksField.set(params, java.util.List.of("A"));
        Boolean resWithBooks = (Boolean) m.invoke(null, params);
        assertTrue(resWithBooks);
    }

    @Test
    void testTryParseParamsInvalidJsonReturnsNull() throws Exception
    {
        Method tryParse = MapApiServer.class.getDeclaredMethod("tryParseParams", String.class);
        tryParse.setAccessible(true);
        Object out = tryParse.invoke(null, "{not: valid json}");
        assertNull(out);
    }

    @Test
    void testBuildWebUiOptionsGeneratesOptionsAndDefaults() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());
        installDummyTranslationBundle();

        // Call parts of buildWebUiOptions directly to avoid ResourceBundle.getBundle
        java.util.Map<String, Object> options = new java.util.LinkedHashMap<>();
        Method populateStd = MapApiServer.class.getDeclaredMethod("populateStandardOptions", java.util.Map.class);
        populateStd.setAccessible(true);
        populateStd.invoke(null, options);

        // ensure grid options added
        Method populateGrid = MapApiServer.class.getDeclaredMethod("populateGridOptions", java.util.Map.class);
        populateGrid.setAccessible(true);
        populateGrid.invoke(null, options);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("options", options);

        Method addDefaults = MapApiServer.class.getDeclaredMethod("addDefaults", java.util.Map.class);
        addDefaults.setAccessible(true);
        addDefaults.invoke(null, result);

        assertTrue(result.containsKey("defaults"));
        assertTrue(options.containsKey("dimensions"));
        Object dims = options.get("dimensions");
        assertTrue(dims instanceof List);
        assertFalse(((List<?>) dims).isEmpty());
    }
}

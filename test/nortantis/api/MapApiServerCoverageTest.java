package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.List;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.GeneratedDimension;
import nortantis.MapSettings;

class MapApiServerCoverageTest
{
    @Test
    void testTryParseAndGenerateRandomSettings() throws Exception
    {
        String json = "{\"dimension\":\"Square\",\"cityFrequency\":10,\"books\":[\"One\",\"Two\"]}";

        Method tryParse = MapApiServer.class.getDeclaredMethod("tryParseParams", String.class);
        tryParse.setAccessible(true);
        Object params = tryParse.invoke(null, json);
        assertNotNull(params);

        // verify the parsed dimension field exists and equals "Square"
        Class<?> paramsClass = params.getClass();
        java.lang.reflect.Field dimField = paramsClass.getDeclaredField("dimension");
        dimField.setAccessible(true);
        Object dim = dimField.get(params);
        assertEquals("Square", dim);

        // generate random settings from params and verify dimension applied
        Method gen = MapApiServer.class.getDeclaredMethod("generateRandomMapSettings", paramsClass);
        gen.setAccessible(true);
        PlatformFactory.setInstance(new AwtFactory());
        try
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
        catch (Throwable t)
        {
            t.printStackTrace();
            fail("Failed to set dummy Translation.bundle: " + t);
        }
        MapSettings settings = (MapSettings) gen.invoke(null, params);
        assertNotNull(settings);
        assertEquals(GeneratedDimension.Square.width, settings.generatedWidth);
    }

    @Test
    void testBuildWebUiOptionsContainsDimensions() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());
        Method m = MapApiServer.class.getDeclaredMethod("populateStandardOptions", Map.class);
        m.setAccessible(true);
        Map<String, Object> container = new java.util.LinkedHashMap<>();
        try
        {
            // Ensure translations are available for populateStandardOptions
            try
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
            catch (Throwable t)
            {
                t.printStackTrace();
                fail("Failed to set dummy Translation.bundle: " + t);
            }
            m.invoke(null, container);
        }
        catch (java.lang.reflect.InvocationTargetException ite)
        {
            Throwable cause = ite.getCause();
            cause.printStackTrace();
            fail("populateStandardOptions invocation failed: " + String.valueOf(cause));
        }
        System.out.println("populateStandardOptions container: " + String.valueOf(container));
        Map<String, Object> options = container;
        if (!options.containsKey("dimensions"))
        {
            fail("populateStandardOptions did not include dimensions, container=" + String.valueOf(container));
        }
        List<?> dims = (List<?>) options.get("dimensions");
        assertFalse(dims.isEmpty());
        Object first = dims.get(0);
        assertTrue(first instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> firstMap = (Map<String, Object>) first;
        assertTrue(firstMap.containsKey("value"));
        assertTrue(firstMap.containsKey("label"));
    }
}

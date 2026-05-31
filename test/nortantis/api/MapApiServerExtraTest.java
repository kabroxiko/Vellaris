package nortantis.api;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

class MapApiServerExtraTest {

    @Test
    void testProcessBundledFontFileUsesFilenameWhenDetectFails() throws Exception {
        Path tmp = Files.createTempFile("Test_Font-Regular", ".ttf");
        tmp.toFile().deleteOnExit();
        // Write some bytes that are not a valid font
        Files.write(tmp, "garbage".getBytes());

        Map<String, Object> fontsMap = new LinkedHashMap<>();
        List<String> result = new ArrayList<>();
        Map<String, String> bundled = new LinkedHashMap<>();

        Method m = MapApiServer.class.getDeclaredMethod("processBundledFontFile", java.nio.file.Path.class, Map.class, List.class, Map.class);
        m.setAccessible(true);
        m.invoke(null, tmp, fontsMap, result, bundled);

        // The method records the bundled path and ensures the family
        // is moved to the front of the result list. It only updates
        // `fontsMap` when a normalized existing key matches, so bundled
        // should contain the entry and result should have the family first.
        assertTrue(bundled.size() > 0, "bundled map should contain the path");
        assertTrue(result.size() > 0 && result.get(0).toLowerCase().contains("test"));
        // fontsMap may remain unchanged when no normalized match exists
        assertTrue(fontsMap.isEmpty() || !fontsMap.values().contains("/fonts/" + tmp.getFileName().toString()));
    }

    @Test
    void testGenerateBackgroundBaseImageVariants() throws Exception {
        PlatformFactory.setInstance(new AwtFactory());

        Method m = MapApiServer.class.getDeclaredMethod("generateBackgroundBaseImage", int.class, int.class, String.class, String.class, String.class);
        m.setAccessible(true);

        Object img1 = m.invoke(null, 64, 64, null, null, null);
        assertNotNull(img1);
        ((nortantis.platform.Image) img1).close();

        Object img2 = m.invoke(null, 64, 64, "FractalNoise", null, null);
        assertNotNull(img2);
        ((nortantis.platform.Image) img2).close();

        // GeneratedFromTexture without texture should fall back to solid
        Object img3 = m.invoke(null, 64, 64, "GeneratedFromTexture", null, null);
        assertNotNull(img3);
        ((nortantis.platform.Image) img3).close();
    }

    @Test
    void testGetCityIconTypesForPackReturnsEmptyOnError() throws Exception {
        Method m = MapApiServer.class.getDeclaredMethod("getCityIconTypesForPack", String.class);
        m.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<String> out = (List<String>) m.invoke(null, "nonexistent-pack-xyz");
        assertNotNull(out);
        assertTrue(out.isEmpty());
    }

    @Test
    void testGetSystemFamiliesAndHardcodedList() throws Exception {
        Method m1 = MapApiServer.class.getDeclaredMethod("getSystemFamilies");
        m1.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<String> families = (List<String>) m1.invoke(null);
        assertNotNull(families);

        Method m2 = MapApiServer.class.getDeclaredMethod("buildHardcodedList");
        m2.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<String> hard = (List<String>) m2.invoke(null);
        assertNotNull(hard);
        assertTrue(hard.size() > 0);
    }
}

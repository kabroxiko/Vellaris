package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;

import java.util.Random;
import java.lang.reflect.Method;

class MapApiServerResolveNortTest
{
    @Test
    void testResolveBestNortContentParsesAndMayInitializeEdits() throws Exception
    {
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

        // Create settings and ensure edits are null to exercise initialization path
        MapSettings settings = SettingsGenerator.generate(new Random(3), Assets.installedArtPack, null);
        settings.edits = null;

        Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("resolveBestNortContent", MapSettings.class);
        m.setAccessible(true);
        Object result = m.invoke(null, settings);

        assertNotNull(result);
        String json = String.valueOf(result);
        assertFalse(json.isBlank());

        // JSON should parse into an object with a version field at least
        com.google.gson.Gson g = new com.google.gson.Gson();
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> map = g.fromJson(json, java.util.Map.class);
        assertNotNull(map);
        assertTrue(map.containsKey("version") || map.containsKey("randomSeed"));
    }
}

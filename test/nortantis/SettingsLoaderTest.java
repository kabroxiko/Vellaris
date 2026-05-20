package nortantis;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Paths;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

public class SettingsLoaderTest {
    @Test
    public void loadMinimalNort() {
        // Ensure a PlatformFactory is set before MapSettings or Color static initializers run
        PlatformFactory.setInstance(new AwtFactory());
        String path = Paths.get("unit test files/map settings/minimal.nort").toAbsolutePath().toString();
        try {
            String fileContents = java.nio.file.Files.readString(Paths.get(path));
            org.json.simple.JSONObject parsed = (org.json.simple.JSONObject) org.json.simple.JSONValue.parseWithException(fileContents);
            assertTrue(parsed.containsKey("drawRegionColors"));
            Object drawRegionColorsVal = parsed.get("drawRegionColors");
            assertNotNull(drawRegionColorsVal, "drawRegionColors parsed as null");
            // Continue to construct MapSettings
            assertDoesNotThrow(() -> {
                MapSettings s = new MapSettings(path);
                assertNotNull(s);
            });
        }
        catch (Exception e)
        {
            fail("Exception while parsing or loading settings: " + e.toString());
        }
    }
}

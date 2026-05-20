package nortantis;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;

public class MapGenerationTest {
    @Test
    public void generateMapAndWriteImage() {
        PlatformFactory.setInstance(new AwtFactory());
        // Initialize translations and preferences used by name generation
        nortantis.swing.translation.Translation.initialize();
        String path = Paths.get("unit test files/map settings/minimal.nort").toAbsolutePath().toString();
        assertDoesNotThrow(() -> {
            MapSettings settings = new MapSettings(path);
            // Reduce decorative/unnamed icons coming from edits and ensure determinism
            settings.edits.freeIcons.clear();
            settings.edits.centerEdits.clear();
            // Lower city probability to reduce number of cities
            settings.cityProbability = 0.00625;
            // Fixed seeds for repeatable names and icon placement
            settings.textRandomSeed = 987654321L;
            settings.randomSeed = 123456789L;
            MapCreator creator = new MapCreator();
            // Use low-memory mode for safety in test environment
            creator.overrideMemoryMode(true);
            // Generate the map
            nortantis.platform.Image image = creator.createMap(settings, null, null);
            assertNotNull(image);
            try {
                java.nio.file.Files.createDirectories(java.nio.file.Paths.get("build/analysis"));
                String out = "build/analysis/example-map.png";
                image.write(out);
            }
            finally {
                image.close();
            }
        });
    }
}

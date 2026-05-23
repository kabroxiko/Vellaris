package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;

import java.lang.reflect.Method;
import java.util.Random;

class MapApiServerInitializeEditsTest
{
	@Test
	void testInitializeEditsFromGraphPopulatesEdits() throws Exception
	{
		// Ensure platform available for graph creation
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		// Create settings with empty edits so MapCreator.createGraphForUnitTests can use it
		MapSettings settings = SettingsGenerator.generate(new Random(5), Assets.installedArtPack, null);
		settings.edits = new nortantis.swing.MapEdits();

		Class<?> c = Class.forName("nortantis.api.MapApiServer");
		Method m = c.getDeclaredMethod("initializeEditsFromGraph", MapSettings.class);
		m.setAccessible(true);
		m.invoke(null, settings);

		assertNotNull(settings.edits, "Expected edits to be non-null after initialization");
		assertTrue(settings.edits.isInitialized(), "Expected edits to be initialized (centerEdits populated)");
	}
}

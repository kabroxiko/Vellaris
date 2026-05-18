package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;

class MapApiServerUiAndBackgroundTest
{
    @Test
    void testBuildWebUiOptionsContainsExpectedKeys() throws Exception
    {
        // Ensure platform and translations are available for labels
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
        try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
        {
            Class<?> c = Class.forName("nortantis.api.MapApiServer");
            Method m = c.getDeclaredMethod("populateStandardOptions", java.util.Map.class);
            m.setAccessible(true);
            java.util.Map<String, Object> options = new java.util.LinkedHashMap<>();
            m.invoke(null, options);
            assertNotNull(options);
            assertTrue(options.containsKey("dimensions"));
        }
    }

    @Test
    void testGenerateSolidBackgroundAndBaseImage() throws Exception
    {
        // Ensure a platform implementation is installed for Image creation
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
        Class<?> c = Class.forName("nortantis.api.MapApiServer");
        Method solid = c.getDeclaredMethod("generateSolidBackground", int.class, int.class);
        solid.setAccessible(true);
        Object img = solid.invoke(null, 64, 64);
        assertNotNull(img);

        Method base = c.getDeclaredMethod("generateBackgroundBaseImage", int.class, int.class, String.class, String.class, String.class);
        base.setAccessible(true);
        Object baseImg = base.invoke(null, 32, 32, null, null, null);
        assertNotNull(baseImg);
        // Close images if they implement AutoCloseable
        if (img instanceof AutoCloseable)
        {
            try
            {
                ((AutoCloseable) img).close();
            }
            catch (Exception e)
            {
                // Ignored: best-effort test cleanup. Failures closing test resources
                // are non-fatal for the test itself and can happen on some CI
                // environments; intentionally swallowing and documenting here.
            }
        }

        if (baseImg instanceof AutoCloseable)
        {
            try
            {
                ((AutoCloseable) baseImg).close();
            }
            catch (Exception e)
            {
                // Ignored: best-effort test cleanup. See comment above.
            }
        }
    }
}

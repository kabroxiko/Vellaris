package nortantis;

import java.lang.reflect.Field;
import java.util.ResourceBundle;

/**
 * Test utility to install a fake Translation.bundle ResourceBundle for tests
 * that need Translation.get() to succeed without loading actual resource files.
 */
public final class TestTranslationBundleInstaller
{
    private TestTranslationBundleInstaller() {}

    /**
     * Installs a fake bundle and returns an AutoCloseable that restores the
     * previous bundle when closed. If installation fails, returns a no-op
     * AutoCloseable.
     */
    public static AutoCloseable installFakeBundle()
    {
        try
        {
            Class<?> trClass = Class.forName("nortantis.swing.translation.Translation");
            Field bundleField = trClass.getDeclaredField("bundle");
            bundleField.setAccessible(true);
            Object previous = bundleField.get(null);

            ResourceBundle fake = new ResourceBundle()
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

            return () ->
            {
                try
                {
                    bundleField.set(null, previous);
                }
                catch (IllegalAccessException e)
                {
                    // Best-effort restore; ignore in tests
                }
            };
        }
        catch (ReflectiveOperationException | SecurityException e)
        {
            // Installation failed; return no-op
            return () -> {};
        }
    }
}

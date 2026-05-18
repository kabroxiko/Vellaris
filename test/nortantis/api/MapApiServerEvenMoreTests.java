package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Method;

class MapApiServerEvenMoreTests
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
    void testTrUsesTranslationBundle() throws Exception
    {
        installDummyTranslationBundle();
        Method tr = MapApiServer.class.getDeclaredMethod("tr", String.class);
        tr.setAccessible(true);
        Object out = tr.invoke(null, "some.key.value");
        assertEquals("some.key.value", out);
    }

    @Test
    void testPrepareFallbackSettingsAdjustsSettings() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());
        // generate a full settings object
        nortantis.MapSettings original = nortantis.SettingsGenerator.generate(new java.util.Random(3), nortantis.util.Assets.installedArtPack, null);
        // set customImagesPath to something and artPack to customArtPack to trigger replacements
        original.customImagesPath = "some/path";
        original.artPack = nortantis.util.Assets.customArtPack;

        Method m = MapApiServer.class.getDeclaredMethod("prepareFallbackSettings", nortantis.MapSettings.class);
        m.setAccessible(true);
        Object fallback = m.invoke(null, original);
        assertNotNull(fallback);
        nortantis.MapSettings fb = (nortantis.MapSettings) fallback;
        assertEquals("", fb.customImagesPath);
        assertEquals(nortantis.util.Assets.installedArtPack, fb.artPack);
    }

    @Test
    void testNamedResourcesToListConverts() throws Exception
    {
        // Create some NamedResource instances and verify conversion
        Class<?> nrClass = Class.forName("nortantis.NamedResource");
        Object a = nrClass.getConstructor(String.class, String.class).newInstance("pack1", "name1");
        Object b = nrClass.getConstructor(String.class, String.class).newInstance("pack2", "name2");
        java.util.List<Object> list = java.util.List.of(a, b);

        Method m = MapApiServer.class.getDeclaredMethod("namedResourcesToList", java.util.List.class);
        m.setAccessible(true);
        java.util.List<?> out = (java.util.List<?>) m.invoke(null, list);
        assertEquals(2, out.size());
        Object first = out.get(0);
        Class<?> infoClass = first.getClass();
        java.lang.reflect.Method getArtPack = infoClass.getMethod("getArtPack");
        java.lang.reflect.Method getName = infoClass.getMethod("getName");
        assertEquals("pack1", getArtPack.invoke(first));
        assertEquals("name1", getName.invoke(first));
    }
}

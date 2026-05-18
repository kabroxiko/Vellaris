package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;

class MapApiServerBuildContextTest
{
    @Test
    void testBuildContextFromNortBodyAppliesLanguage() throws Exception
    {
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
        try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
        {
            // bundle installed for the duration of this block
        }

        // Create a deterministic MapSettings JSON
        MapSettings settings = SettingsGenerator.generate(new Random(1), Assets.installedArtPack, null);
        String json = settings.toJsonString();

        // Create params and set language override
        Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
        Object params = paramsClass.getDeclaredConstructor().newInstance();
        Field langField = paramsClass.getDeclaredField("language");
        langField.setAccessible(true);
        langField.set(params, "zz");

        // Invoke private helper
        Method m = MapApiServer.class.getDeclaredMethod("buildContextFromNortBody", String.class, paramsClass, io.javalin.http.Context.class);
        m.setAccessible(true);
        Object grc = m.invoke(null, json, params, null);

        assertNotNull(grc);

        Class<?> grcClass = Class.forName("nortantis.api.MapApiServer$GenerationRequestContext");
        Field settingsField = grcClass.getDeclaredField("settings");
        settingsField.setAccessible(true);
        Object outSettings = settingsField.get(grc);
        assertNotNull(outSettings);

        Field languageField = outSettings.getClass().getDeclaredField("language");
        languageField.setAccessible(true);
        assertEquals("zz", languageField.get(outSettings));

        Field ctxField = grcClass.getDeclaredField("ctx");
        ctxField.setAccessible(true);
        Object genCtx = ctxField.get(grc);
        assertNotNull(genCtx);
        Field innerSettings = genCtx.getClass().getDeclaredField("settings");
        innerSettings.setAccessible(true);
        Object innerSettingsVal = innerSettings.get(genCtx);
        assertNotNull(innerSettingsVal);
    }
}

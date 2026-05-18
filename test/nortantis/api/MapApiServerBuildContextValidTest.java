package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;

class MapApiServerBuildContextValidTest
{
    @Test
    void testBuildContextFromNortBodyValidReturnsGenerationRequestContext() throws Exception
    {
        // Ensure platform and translations are available for MapSettings creation
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
        try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
        {
            // bundle available in this block
        }

        // Create deterministic MapSettings JSON
        MapSettings settings = SettingsGenerator.generate(new Random(2), Assets.installedArtPack, null);
        String json = settings.toJsonString();

        Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
        Object params = paramsClass.getDeclaredConstructor().newInstance();

        Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("buildContextFromNortBody", String.class, paramsClass, io.javalin.http.Context.class);
        m.setAccessible(true);
        Object grc = m.invoke(null, json, params, null);

        assertNotNull(grc, "Expected non-null GenerationRequestContext for valid nort JSON");

        Class<?> grcClass = Class.forName("nortantis.api.MapApiServer$GenerationRequestContext");
        Field settingsField = grcClass.getDeclaredField("settings");
        settingsField.setAccessible(true);
        Object outSettings = settingsField.get(grc);
        assertNotNull(outSettings);

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

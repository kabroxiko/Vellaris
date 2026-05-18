package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.platform.Image;
import nortantis.platform.ImageType;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

class MapApiServerExecuteGenerationSuccessTest
{
    @Test
    void testExecuteGenerationAndReturnSuccess() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());

        // Supplier that returns a MapCreator whose createMap returns a small image
        Supplier<nortantis.MapCreator> sup = () -> new nortantis.MapCreator()
        {
            @Override
            public nortantis.platform.Image createMap(nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
            {
                return Image.create(16, 16, ImageType.RGB);
            }
        };

        Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
        f.setAccessible(true);
        @SuppressWarnings("unchecked")
        AtomicReference<Supplier<nortantis.MapCreator>> ref = (AtomicReference<Supplier<nortantis.MapCreator>>) f.get(null);
        ref.set(sup);

        MapSettings settings = SettingsGenerator.generate(new Random(3), Assets.installedArtPack, null);
        settings.edits = new nortantis.swing.MapEdits();
        settings.edits.centerEdits.put(0, new nortantis.editor.CenterEdit(0, false, false, null, null, null));

        ApiUtils.RandomMapParameters params = new ApiUtils.RandomMapParameters();
        Class<?> serverClass = Class.forName("nortantis.api.MapApiServer");

        final String[] recorded = new String[1];
        io.javalin.http.Context proxy = (io.javalin.http.Context) java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{io.javalin.http.Context.class}, (proxyObj, method, args) -> {
            if ("status".equals(method.getName()) && args != null && args.length == 1)
            {
                recorded[0] = String.valueOf(args[0]);
                return proxyObj;
            }
            if (method.getReturnType().isPrimitive())
            {
                if (method.getReturnType() == boolean.class) return false;
                if (method.getReturnType() == int.class) return 0;
                if (method.getReturnType() == long.class) return 0L;
                if (method.getReturnType() == double.class) return 0.0;
            }
            return null;
        });

        String body = settings.toJsonString();
        java.lang.reflect.Method buildNort = serverClass.getDeclaredMethod("buildContextFromNortBody", String.class, ApiUtils.RandomMapParameters.class, io.javalin.http.Context.class);
        buildNort.setAccessible(true);
        Object grc = buildNort.invoke(null, body, params, proxy);

        Method m = serverClass.getDeclaredMethod("executeGenerationAndReturn", grc.getClass(), io.javalin.http.Context.class);
        m.setAccessible(true);
        Object result = m.invoke(null, grc, proxy);

        assertNotNull(result);
        String json = String.valueOf(result);
        assertEquals("200", recorded[0]);
        assertTrue(json.contains("imageBase64") || json.contains("imageBase64"));
    }
}

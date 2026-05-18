package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.platform.Image;
import nortantis.platform.ImageType;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Assets;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

class MapApiServerGenerationTest
{
    @Test
    void testGenerateMapPrimarySuccess() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());

        // Inject supplier that always returns a MapCreator which returns a small image
        Supplier<MapCreator> sup = () -> new MapCreator()
        {
            @Override
            public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
            {
                return Image.create(8, 8, ImageType.ARGB);
            }
        };

        // Set the atomic supplier in MapApiServer
        Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
        f.setAccessible(true);
        @SuppressWarnings("unchecked")
        java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>> ref = (java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>>) f.get(null);
        ref.set(sup);

        MapSettings settings = SettingsGenerator.generate(new Random(), Assets.installedArtPack, null);

        Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("generateMap", MapSettings.class, Integer.class, Integer.class);
        m.setAccessible(true);
        Object result = m.invoke(null, settings, null, null);

        Field imgField = result.getClass().getDeclaredField("image");
        imgField.setAccessible(true);
        Object img = imgField.get(result);
        assertNotNull(img, "Expected primary render image to be returned");
        // close returned image
        ((Image) img).close();
    }

    @Test
    void testGenerateMapPrimaryFailsFallbackSucceeds() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());

        AtomicInteger calls = new AtomicInteger(0);
        Supplier<MapCreator> sup = () ->
        {
            if (calls.getAndIncrement() == 0)
            {
                return new MapCreator()
                {
                    @Override
                    public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
                    {
                        throw new RuntimeException("primary-failure");
                    }
                };
            }
            else
            {
                return new MapCreator()
                {
                    @Override
                    public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
                    {
                            return Image.create(6, 6, ImageType.ARGB);
                        }
                    };
            }
        };

        Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
        f.setAccessible(true);
        @SuppressWarnings("unchecked")
        java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>> ref = (java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>>) f.get(null);
        ref.set(sup);

        MapSettings settings = SettingsGenerator.generate(new Random(), Assets.installedArtPack, null);

        Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("generateMap", MapSettings.class, Integer.class, Integer.class);
        m.setAccessible(true);
        Object result = m.invoke(null, settings, null, null);

        Field imgField = result.getClass().getDeclaredField("image");
        imgField.setAccessible(true);
        Object img = imgField.get(result);
        assertNotNull(img, "Expected fallback render image to be returned");
        ((Image) img).close();
    }

    @Test
    void testGenerateMapBothFail() throws Exception
    {
        PlatformFactory.setInstance(new AwtFactory());

        Supplier<MapCreator> sup = () -> new MapCreator()
        {
            @Override
            public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
            {
                throw new RuntimeException("always-fail");
            }
        };

        Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
        f.setAccessible(true);
        @SuppressWarnings("unchecked")
        java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>> ref = (java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>>) f.get(null);
        ref.set(sup);

        MapSettings settings = SettingsGenerator.generate(new Random(), Assets.installedArtPack, null);

        Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("generateMap", MapSettings.class, Integer.class, Integer.class);
        m.setAccessible(true);
        Object result = m.invoke(null, settings, null, null);

        Field msgField = result.getClass().getDeclaredField("errorMessage");
        msgField.setAccessible(true);
        Object msg = msgField.get(result);
        assertNotNull(msg, "Expected an error message when both primary and fallback fail");
    }
}

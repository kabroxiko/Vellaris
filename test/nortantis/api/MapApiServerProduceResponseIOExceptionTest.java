package nortantis.api;

import org.junit.jupiter.api.Test;

import nortantis.MapSettings;
import nortantis.platform.Image;
import nortantis.platform.ImageType;

import javax.imageio.spi.IIORegistry;
import javax.imageio.spi.ImageWriterSpi;
import javax.imageio.ImageWriter;
import javax.imageio.IIOImage;
import javax.imageio.ImageWriteParam;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.ImageTypeSpecifier;

import io.javalin.http.Context;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class MapApiServerProduceResponseIOExceptionTest
{
    @Test
    void testProduceResponseFromImageIOException() throws Exception
    {
        // Ensure AWT platform available
        Class<?> pfClass = Class.forName("nortantis.platform.PlatformFactory");
        Class<?> awtClass = Class.forName("nortantis.platform.awt.AwtFactory");
        Object awtInst = awtClass.getDeclaredConstructor().newInstance();
        pfClass.getDeclaredMethod("setInstance", pfClass).invoke(null, awtInst);

        // Create small image
        Image img = Image.create(8, 8, ImageType.RGB);

        try
        {
            // Build GenerationContext
            Class<?> mapApiClass = Class.forName("nortantis.api.MapApiServer");
            Class<?> genCtxClass = Class.forName("nortantis.api.MapApiServer$GenerationContext");
            Constructor<?> ctor = genCtxClass.getDeclaredConstructor(MapSettings.class);
            ctor.setAccessible(true);
            // use a normal settings instance
            MapSettings settings = new MapSettings();
            Object genCtx = ctor.newInstance(settings);

            // Register a throwing ImageWriterSpi for "png"
            IIORegistry registry = IIORegistry.getDefaultInstance();
            ImageWriterSpi spi = new ImageWriterSpi(
                    "testVendor",
                    "1.0",
                    new String[]{"png"},
                    new String[]{"png"},
                    new String[]{"image/png"},
                    "ThrowingWriter",
                    new Class[]{javax.imageio.stream.ImageOutputStream.class},
                    new String[]{},
                    false,
                    null,
                    null,
                    null,
                    null,
                    false,
                    null,
                    null,
                    null,
                    null)
            {
                @Override
                public ImageWriter createWriterInstance(Object extension) throws IOException
                {
                    return new ImageWriter(this)
                    {
                        @Override
                        public void write(IIOMetadata streamMetadata, IIOImage image, ImageWriteParam param) throws IOException
                        {
                            throw new IOException("forced-failure");
                        }

                        @Override
                        public IIOMetadata convertImageMetadata(IIOMetadata inData, ImageTypeSpecifier imageType, ImageWriteParam param)
                        {
                            return inData;
                        }

                        @Override
                        public IIOMetadata convertStreamMetadata(IIOMetadata inData, ImageWriteParam param)
                        {
                            return inData;
                        }

                        @Override
                        public void dispose() {
                            // Intentionally no-op: this test ImageWriter is a minimal
                            // stub that does not hold external resources (streams, files,
                            // threads). We override dispose() to satisfy the abstract
                            // API but do not need to release anything here.
                        }

                        @Override
                        public IIOMetadata getDefaultImageMetadata(ImageTypeSpecifier imageType, ImageWriteParam param)
                        {
                            return null;
                        }

                        @Override
                        public IIOMetadata getDefaultStreamMetadata(ImageWriteParam param)
                        {
                            return null;
                        }
                    };
                }

                @Override
                public boolean canEncodeImage(ImageTypeSpecifier type)
                {
                    return true;
                }

                @Override
                public String getDescription(Locale locale)
                {
                    return "Throwing SPI";
                }
            };

            registry.registerServiceProvider(spi);

            // Build a simple Context proxy to capture status/result
            AtomicInteger status = new AtomicInteger(-1);
            StringBuilder result = new StringBuilder();

            Context ctx = (Context) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{Context.class}, (proxy, method, args) -> {
                String name = method.getName();
                if ("status".equals(name) && args != null && args.length == 1)
                {
                    status.set((Integer) args[0]);
                    return null;
                }
                if ("result".equals(name) && args != null && args.length == 1)
                {
                    result.append(String.valueOf(args[0]));
                    return null;
                }
                if ("contentType".equals(name) && args != null && args.length == 1)
                {
                    return null;
                }
                return null;
            });

            // Invoke private produceResponseFromImage
            Method m = mapApiClass.getDeclaredMethod("produceResponseFromImage", Class.forName("nortantis.platform.Image"), genCtxClass, Context.class);
            m.setAccessible(true);
            Object ret = m.invoke(null, img, genCtx, ctx);

            // Ensure IOException branch taken
            assertEquals(500, status.get());
            assertNotNull(ret);
            assertTrue(ret instanceof String);
            assertTrue(((String) ret).contains("Failed to produce JSON response"));

            // Clean up: deregister spi
            registry.deregisterServiceProvider(spi);
        }
        finally
        {
            img.close();
        }
    }
}

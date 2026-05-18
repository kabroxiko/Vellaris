package nortantis.api;

import nortantis.platform.Image;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Assets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;

import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class MapApiServerGenerateBackgroundFromTextureTest
{
    private Assets.AssetInputStreamProvider originalProvider;

    @AfterEach
    void tearDown()
    {
        // restore provider
        Assets.setAssetInputStreamProvider(originalProvider);
    }

    @Test
    void testGenerateBackgroundFromTexture_withInjectedAssetStream_returnsImage() throws Exception
    {
        // Save original and inject provider that returns a tiny PNG for any asset path
        originalProvider = null;

        Assets.setAssetInputStreamProvider(new Assets.AssetInputStreamProvider()
        {
            @Override
            public InputStream open(String assetPath) {
                try
                {
                    BufferedImage img = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(img, "png", baos);
                    return new ByteArrayInputStream(baos.toByteArray());
                }
                catch (Exception e)
                {
                    throw new RuntimeException(e);
                }
            }
        });

        // Ensure AWT-backed platform is available for reading image streams
        PlatformFactory.setInstance(new AwtFactory());

        // Call private static generateBackgroundFromTexture(String, String, int, int)
        Method m = MapApiServer.class.getDeclaredMethod("generateBackgroundFromTexture", String.class, String.class, int.class, int.class);
        m.setAccessible(true);
        Object result = m.invoke(null, "dummyTexture.png", "nortantis", 32, 32);

        assertNotNull(result, "generateBackgroundFromTexture should return an Image when asset input stream is provided");

        // Close the image if possible
        if (result instanceof Image)
        {
            ((Image) result).close();
        }
    }
}

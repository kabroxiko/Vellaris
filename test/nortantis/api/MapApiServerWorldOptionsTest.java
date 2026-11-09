package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.Image;
import nortantis.platform.ImageType;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Method;
import java.util.Base64;
import javax.imageio.ImageIO;

/**
 * Covers the query flag that decides whether /api/world also returns the rendered map, and the encoding that keeps the raw image route and
 * the base64 representations carrying identical bytes.
 */
class MapApiServerWorldOptionsTest
{
	@BeforeAll
	static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
	}

	private static Object invoke(String methodName, Class<?> parameterType, Object argument) throws Exception
	{
		Method method = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod(methodName, parameterType);
		method.setAccessible(true);
		return method.invoke(null, argument);
	}

	private static Object invokeImageEncoder(String methodName, Image image, Integer maxDimension, float quality) throws Exception
	{
		Method method = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod(methodName, Image.class, Integer.class, float.class);
		method.setAccessible(true);
		return method.invoke(null, image, maxDimension, Float.valueOf(quality));
	}

	private static java.awt.image.BufferedImage decode(byte[] bytes) throws Exception
	{
		return ImageIO.read(new ByteArrayInputStream(bytes));
	}

	private static boolean parseBooleanFlag(String value) throws Exception
	{
		return (boolean) invoke("parseBooleanFlag", String.class, value);
	}

	@Test
	void testIncludeImageAcceptsCommonTruthySpellings() throws Exception
	{
		assertTrue(parseBooleanFlag("true"));
		assertTrue(parseBooleanFlag("TRUE"));
		assertTrue(parseBooleanFlag("True"));
		assertTrue(parseBooleanFlag("1"));
		assertTrue(parseBooleanFlag("yes"));
		assertTrue(parseBooleanFlag(" true "));
	}

	@Test
	void testIncludeImageTreatsEverythingElseAsFalse() throws Exception
	{
		assertFalse(parseBooleanFlag(null), "Omitting the flag must not add an image to the response");
		assertFalse(parseBooleanFlag(""));
		assertFalse(parseBooleanFlag("false"));
		assertFalse(parseBooleanFlag("0"));
		assertFalse(parseBooleanFlag("no"));
		assertFalse(parseBooleanFlag("anything else"));
	}

	/**
	 * The raw image route and the base64 representations must carry the same bytes for the same settings, otherwise a client could get a
	 * different map depending on which endpoint it used.
	 */
	@Test
	void testJpegEncodingMatchesBase64Encoding() throws Exception
	{
		Image image = Image.create(16, 12, ImageType.ARGB);
		try
		{
			byte[] jpeg = (byte[]) invokeImageEncoder("encodeImageAsJpeg", image, null, ApiUtils.DEFAULT_JPEG_QUALITY);
			String base64 = (String) invokeImageEncoder("encodeImageAsBase64", image, null, ApiUtils.DEFAULT_JPEG_QUALITY);

			assertArrayEquals(jpeg, Base64.getDecoder().decode(base64), "Both encodings must produce the same JPEG bytes");
			assertTrue(jpeg.length > 8, "Encoded image should have content");
			assertEquals((byte) 0xFF, jpeg[0], "Encoded bytes should start with the JPEG signature");
			assertEquals((byte) 0xD8, jpeg[1]);
			assertEquals((byte) 0xFF, jpeg[2]);
		}
		finally
		{
			image.close();
		}
	}

	/**
	 * Leaving the limit unset must return the render at its full size, because the raw image route is how a client gets the map it shows to
	 * players. Capping it silently is what made large maps come back looking pixelated when the browser scaled them back up.
	 */
	@Test
	void testNoLimitKeepsFullSizeAndLimitDownscales() throws Exception
	{
		Image image = Image.create(200, 100, ImageType.ARGB);
		try
		{
			byte[] fullSize = (byte[]) invokeImageEncoder("encodeImageAsJpeg", image, null, ApiUtils.DEFAULT_JPEG_QUALITY);
			assertEquals(200, decode(fullSize).getWidth(), "An unset limit must not downscale the image");
			assertEquals(100, decode(fullSize).getHeight());

			byte[] capped = (byte[]) invokeImageEncoder("encodeImageAsJpeg", image, Integer.valueOf(100), ApiUtils.DEFAULT_JPEG_QUALITY);
			assertEquals(100, decode(capped).getWidth(), "A limit should scale the longest side down to it");
			assertEquals(50, decode(capped).getHeight());
		}
		finally
		{
			image.close();
		}
	}
}

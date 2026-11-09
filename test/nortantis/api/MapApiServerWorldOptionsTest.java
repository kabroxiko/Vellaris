package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.Image;
import nortantis.platform.ImageType;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Method;
import java.util.Base64;

/**
 * Covers the query flag that decides whether /api/world also returns the rendered map, and the encoding that keeps the raw PNG route and
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
	 * The raw PNG route and the base64 representations must carry the same bytes, otherwise a client could get a different map depending on
	 * which endpoint it used.
	 */
	@Test
	void testPngEncodingMatchesBase64Encoding() throws Exception
	{
		Image image = Image.create(16, 12, ImageType.ARGB);
		try
		{
			byte[] png = (byte[]) invoke("encodeImageAsPng", Image.class, image);
			String base64 = (String) invoke("encodeImageAsBase64", Image.class, image);

			assertArrayEquals(png, Base64.getDecoder().decode(base64), "Both encodings must produce the same PNG bytes");
			assertTrue(png.length > 8, "Encoded PNG should have content");
			assertEquals((byte) 0x89, png[0], "Encoded bytes should start with the PNG signature");
			assertEquals('P', png[1]);
			assertEquals('N', png[2]);
			assertEquals('G', png[3]);
		}
		finally
		{
			image.close();
		}
	}
}

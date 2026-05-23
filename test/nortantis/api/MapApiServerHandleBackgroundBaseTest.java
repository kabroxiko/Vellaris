package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Assets;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

class MapApiServerHandleBackgroundBaseTest
{
	@Test
	void testHandleBackgroundBaseTextureProducesPng() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());

		// Create tiny PNG bytes
		BufferedImage bi = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
		byte[] png;
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
		{
			ImageIO.write(bi, "png", baos);
			png = baos.toByteArray();
		}

		Assets.AssetInputStreamProvider provider = assetPath -> new ByteArrayInputStream(png);
		Assets.setAssetInputStreamProvider(provider);

		final String body = "{\"width\":4,\"height\":4,\"type\":\"GeneratedFromTexture\",\"cityIconType\":\"someTexture.png\",\"artPack\":\"nortantis\"}";
		final String[] recordedStatus = new String[1];
		final Object[] recordedResult = new Object[1];

		io.javalin.http.Context proxy = (io.javalin.http.Context) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { io.javalin.http.Context.class }, (proxyObj, method, args) ->
		{
			String name = method.getName();
			if ("body".equals(name) && (args == null || args.length == 0))
				return body;
			if ("status".equals(name) && args != null && args.length == 1)
			{
				recordedStatus[0] = String.valueOf(args[0]);
				return proxyObj;
			}
			if ("contentType".equals(name) && args != null && args.length == 1)
			{
				return proxyObj;
			}
			if ("result".equals(name) && args != null && args.length == 1)
			{
				recordedResult[0] = args[0];
				return proxyObj;
			}
			if (method.getReturnType().isPrimitive())
			{
				if (method.getReturnType() == boolean.class)
					return false;
				if (method.getReturnType() == int.class)
					return 0;
				if (method.getReturnType() == long.class)
					return 0L;
				if (method.getReturnType() == double.class)
					return 0.0;
			}
			return null;
		});

		Class<?> server = Class.forName("nortantis.api.MapApiServer");
		Method m = server.getDeclaredMethod("handleBackgroundBase", io.javalin.http.Context.class);
		m.setAccessible(true);
		m.invoke(null, proxy);

		assertEquals("200", recordedStatus[0]);
		assertNotNull(recordedResult[0]);
		assertTrue(recordedResult[0] instanceof byte[]);
		assertTrue(((byte[]) recordedResult[0]).length > 0);

		// clear provider
		Assets.setAssetInputStreamProvider(null);
	}

	@Test
	void testHandleBackgroundBaseMissingDimensions() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());

		final String body = "{}";
		final String[] recordedStatus = new String[1];
		final String[] recordedContentType = new String[1];
		final Object[] recordedResult = new Object[1];

		io.javalin.http.Context proxy = (io.javalin.http.Context) java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { io.javalin.http.Context.class },
				(proxyObj, method, args) ->
				{
					String name = method.getName();
					if ("body".equals(name) && (args == null || args.length == 0))
						return body;
					if ("status".equals(name) && args != null && args.length == 1)
					{
						recordedStatus[0] = String.valueOf(args[0]);
						return proxyObj;
					}
					if ("contentType".equals(name) && args != null && args.length == 1)
					{
						recordedContentType[0] = String.valueOf(args[0]);
						return proxyObj;
					}
					if ("result".equals(name) && args != null && args.length == 1)
					{
						recordedResult[0] = args[0];
						return proxyObj;
					}
					if (method.getReturnType().isPrimitive())
					{
						if (method.getReturnType() == boolean.class)
							return false;
						if (method.getReturnType() == int.class)
							return 0;
						if (method.getReturnType() == long.class)
							return 0L;
						if (method.getReturnType() == double.class)
							return 0.0;
					}
					return null;
				});

		Class<?> server2 = Class.forName("nortantis.api.MapApiServer");
		java.lang.reflect.Method m2 = server2.getDeclaredMethod("handleBackgroundBase", io.javalin.http.Context.class);
		m2.setAccessible(true);
		m2.invoke(null, proxy);

		assertEquals("400", recordedStatus[0]);
		assertEquals("application/json", recordedContentType[0]);
		assertNotNull(recordedResult[0]);
		String json = String.valueOf(recordedResult[0]);
		assertTrue(json.contains("Missing required fields") || json.contains("width"));
	}

	@Test
	void testHandleBackgroundBaseTextureFallbackProducesPng() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());

		final String body = "{\"width\":16,\"height\":16,\"type\":\"GeneratedFromTexture\",\"cityIconType\":null}";
		final String[] recordedStatus = new String[1];
		final String[] recordedContentType = new String[1];
		final Object[] recordedResult = new Object[1];

		io.javalin.http.Context proxy = (io.javalin.http.Context) java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { io.javalin.http.Context.class },
				(proxyObj, method, args) ->
				{
					String name = method.getName();
					if ("body".equals(name) && (args == null || args.length == 0))
						return body;
					if ("status".equals(name) && args != null && args.length == 1)
					{
						recordedStatus[0] = String.valueOf(args[0]);
						return proxyObj;
					}
					if ("contentType".equals(name) && args != null && args.length == 1)
					{
						recordedContentType[0] = String.valueOf(args[0]);
						return proxyObj;
					}
					if ("result".equals(name) && args != null && args.length == 1)
					{
						recordedResult[0] = args[0];
						return proxyObj;
					}
					if (method.getReturnType().isPrimitive())
					{
						if (method.getReturnType() == boolean.class)
							return false;
						if (method.getReturnType() == int.class)
							return 0;
						if (method.getReturnType() == long.class)
							return 0L;
						if (method.getReturnType() == double.class)
							return 0.0;
					}
					return null;
				});

		Class<?> server = Class.forName("nortantis.api.MapApiServer");
		java.lang.reflect.Method m = server.getDeclaredMethod("handleBackgroundBase", io.javalin.http.Context.class);
		m.setAccessible(true);
		m.invoke(null, proxy);

		assertEquals("200", recordedStatus[0]);
		assertEquals("image/png", recordedContentType[0]);
		assertNotNull(recordedResult[0]);
		assertTrue(recordedResult[0] instanceof byte[]);
		byte[] bytes = (byte[]) recordedResult[0];
		assertTrue(bytes.length > 0);
	}
}

package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Method;

class MapApiServerGenerateBaseImageTest
{
	@Test
	void testGenerateBaseImageAndWriteResponseWritesPng() throws Exception
	{
		PlatformFactory.setInstance(new AwtFactory());

		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final byte[][] captured = new byte[1][];

		java.lang.reflect.InvocationHandler ih = (proxy, method, args) ->
		{
			String name = method.getName();
			if ("body".equals(name))
			{
				return "{\"width\":32,\"height\":24,\"type\":\"SolidColor\"}";
			}
			if ("contentType".equals(name))
			{
				return proxy;
			}
			if ("status".equals(name))
			{
				return proxy;
			}
			if ("result".equals(name) && args != null && args.length == 1)
			{
				Object a = args[0];
				if (a instanceof byte[])
				{
					captured[0] = (byte[]) a;
					return proxy;
				}
				return proxy;
			}
			return proxy;
		};

		Object ctx = java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { ctxIface }, ih);

		Method m = MapApiServer.class.getDeclaredMethod("generateBaseImageAndWriteResponse", ctxIface);
		m.setAccessible(true);
		Object img = m.invoke(null, ctx);
		assertNotNull(img, "Expected Image returned");

		// ensure bytes were captured and look like PNG (89 50 4E 47)
		assertNotNull(captured[0], "PNG bytes should have been written to ctx.result(byte[])");
		byte[] bytes = captured[0];
		assertTrue(bytes.length > 8, "PNG bytes length reasonable");
		assertEquals((byte) 0x89, bytes[0]);
		assertEquals((byte) 0x50, bytes[1]);
		assertEquals((byte) 0x4E, bytes[2]);
		assertEquals((byte) 0x47, bytes[3]);

		// don't attempt to close implementation-specific Image here
	}
}

package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

class MapApiServerBackgroundBaseValidTest
{
	@Test
	void testGenerateBaseImageAndWriteResponseProducesPng() throws Exception
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final String[] recorded = new String[3]; // contentType, status, resultBytes as hex

		InvocationHandler handler = (proxy, method, args) ->
		{
			String name = method.getName();
			if ("body".equals(name))
			{
				return "{\"width\":4,\"height\":4,\"type\":\"SolidColor\"}";
			}
			if ("contentType".equals(name) && args != null && args.length == 1)
			{
				recorded[0] = String.valueOf(args[0]);
				return null;
			}
			if ("status".equals(name) && args != null && args.length == 1)
			{
				recorded[1] = String.valueOf(args[0]);
				return null;
			}
			if ("result".equals(name) && args != null && args.length == 1)
			{
				Object a0 = args[0];
				if (a0 instanceof byte[])
				{
					byte[] b = (byte[]) a0;
					// check PNG signature
					if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G')
					{
						recorded[2] = "png";
					}
					else
					{
						recorded[2] = "notpng";
					}
				}
				return null;
			}
			return null;
		};

		Object ctxProxy = Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { ctxIface }, handler);

		java.lang.reflect.Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("generateBaseImageAndWriteResponse", ctxIface);
		m.setAccessible(true);
		Object res = m.invoke(null, ctxProxy);

		// method returns Image; it may be non-null and must be closed by caller, generateBaseImageAndWriteResponse returns the Image when
		// successful
		assertNotNull(res);
		assertEquals("image/png", recorded[0]);
		assertEquals("200", recorded[1]);
		assertEquals("png", recorded[2]);
	}
}

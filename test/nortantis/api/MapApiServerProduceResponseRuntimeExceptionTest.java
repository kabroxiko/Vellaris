package nortantis.api;

import org.junit.jupiter.api.Test;

import nortantis.MapSettings;
import nortantis.platform.Image;
import nortantis.platform.ImageType;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.concurrent.atomic.AtomicInteger;

import io.javalin.http.Context;

import static org.junit.jupiter.api.Assertions.*;

class MapApiServerProduceResponseRuntimeExceptionTest
{
	@Test
	void testProduceResponseFromImageRuntimeException() throws Exception
	{
		// Ensure AWT factory present
		Class<?> pfClass = Class.forName("nortantis.platform.PlatformFactory");
		Class<?> awtClass = Class.forName("nortantis.platform.awt.AwtFactory");
		Object awtInst = awtClass.getDeclaredConstructor().newInstance();
		pfClass.getDeclaredMethod("setInstance", pfClass).invoke(null, awtInst);

		// Create a small image
		Image img = Image.create(8, 8, ImageType.RGB);

		try
		{
			// Subclass MapSettings to force toJsonString to throw a RuntimeException
			class BadSettings extends MapSettings
			{
				@Override
				public String toJsonString()
				{
					throw new RuntimeException("forced-failure");
				}
			}

			MapSettings settings = new BadSettings();

			// Build GenerationContext via reflection
			Class<?> mapApiClass = Class.forName("nortantis.api.MapApiServer");
			Class<?> genCtxClass = Class.forName("nortantis.api.MapApiServer$GenerationContext");
			Constructor<?> ctor = genCtxClass.getDeclaredConstructor(MapSettings.class);
			ctor.setAccessible(true);
			Object genCtx = ctor.newInstance(settings);

			// Build a simple Context proxy to capture status/result
			AtomicInteger status = new AtomicInteger(-1);
			StringBuilder result = new StringBuilder();

			Context ctx = (Context) Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { Context.class }, (proxy, method, args) ->
			{
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

			assertEquals(500, status.get());
			assertNotNull(ret);
			assertTrue(ret instanceof String);
			assertTrue(((String) ret).contains("Failed to produce JSON response"));
		}
		finally
		{
			img.close();
		}
	}
}

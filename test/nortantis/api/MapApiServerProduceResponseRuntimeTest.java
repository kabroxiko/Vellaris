package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;
import nortantis.platform.Image;
import nortantis.platform.ImageType;

import java.lang.reflect.Method;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.Random;

class MapApiServerProduceResponseRuntimeTest
{
	@Test
	void testProduceResponseFromImageHandlesRuntimeExceptionFromContext() throws Exception
	{
		// Ensure platform available for Image creation
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		// Create a tiny image
		Image img = Image.create(8, 8, ImageType.ARGB);

		// Create settings and ensure edits initialized to avoid heavy graph work
		MapSettings settings = SettingsGenerator.generate(new Random(4), Assets.installedArtPack, null);
		settings.edits = new nortantis.swing.MapEdits();
		settings.edits.centerEdits.put(0, new nortantis.editor.CenterEdit(0, false, false, null, null, null));

		// Build GenerationContext via reflection
		Class<?> genCtxClass = Class.forName("nortantis.api.MapApiServer$GenerationContext");
		java.lang.reflect.Constructor<?> ctor = genCtxClass.getDeclaredConstructor(nortantis.MapSettings.class);
		ctor.setAccessible(true);
		Object genCtx = ctor.newInstance(settings);

		// Proxy Context: make contentType throw a RuntimeException to simulate a failure during response writing
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final String[] recorded = new String[1];
		InvocationHandler handler = (proxy, method, args) ->
		{
			String name = method.getName();
			if ("contentType".equals(name) && args != null && args.length == 1)
			{
				throw new RuntimeException("simulated-contentType-failure");
			}
			if ("status".equals(name) && args != null && args.length == 1)
			{
				recorded[0] = String.valueOf(args[0]);
				return null;
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
		};

		Object ctxProxy = Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { ctxIface }, handler);

		// Invoke private static produceResponseFromImage(Image, GenerationContext, Context)
		Class<?> c = Class.forName("nortantis.api.MapApiServer");
		Method m = c.getDeclaredMethod("produceResponseFromImage", nortantis.platform.Image.class, genCtxClass, ctxIface);
		m.setAccessible(true);
		Object result = m.invoke(null, img, genCtx, ctxProxy);

		assertNotNull(result);
		String json = String.valueOf(result);
		assertTrue(json.contains("Failed to produce JSON response"), "Expected an error ApiResponse JSON");
		// Status should have been set to 500 by the catch handler
		assertEquals("500", recorded[0]);

		// Cleanup
		img.close();
	}
}

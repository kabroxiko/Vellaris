package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;
import nortantis.swing.MapEdits;

import java.awt.image.BufferedImage;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.Random;

class MapApiServerReturnJsonTest
{
	@Test
	void testReturnJsonResponseProducesImageBase64AndSetsContext() throws Exception
	{
		// Create a tiny buffered image
		BufferedImage buf = new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB);

		// Ensure AWT platform available for color/image helpers
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		// Create settings and mark edits initialized to avoid graph creation
		MapSettings settings = SettingsGenerator.generate(new Random(1), Assets.installedArtPack, null);
		// Ensure edits are flagged as initialized to skip initializeEditsFromGraph
		settings.edits = new MapEdits();
		settings.edits.centerEdits.put(0, new nortantis.editor.CenterEdit(0, false, false, null, null, null));

		// Create a lightweight proxy Context that records contentType and status
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final String[] recorded = new String[2]; // [0]=contentType, [1]=status as string
		InvocationHandler handler = (proxy, method, args) ->
		{
			String name = method.getName();
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
			// default: return null or reasonable default
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

		// Invoke private static returnJsonResponse(BufferedImage, MapSettings, Context)
		Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("returnJsonResponse", java.awt.image.BufferedImage.class, MapSettings.class, ctxIface);
		m.setAccessible(true);
		Object result = m.invoke(null, buf, settings, ctxProxy);
		assertNotNull(result);
		String json = String.valueOf(result);
		assertTrue(json.contains("imageBase64"), "Expected returned JSON to contain imageBase64");

		assertEquals("application/json", recorded[0]);
		assertEquals("200", recorded[1]);
	}
}

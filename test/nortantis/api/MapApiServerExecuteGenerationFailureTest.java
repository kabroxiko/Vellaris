package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.util.Assets;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

class MapApiServerExecuteGenerationFailureTest
{
	@Test
	void testExecuteGenerationAndReturnHandlesNullImage() throws Exception
	{
		// Ensure AWT platform
		PlatformFactory.setInstance(new AwtFactory());

		// Inject supplier that returns MapCreator whose createMap returns null
		Supplier<nortantis.MapCreator> sup = () -> new nortantis.MapCreator()
		{
			@Override
			public nortantis.platform.Image createMap(nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
			{
				return null; // simulate failure
			}
		};

		Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
		f.setAccessible(true);
		@SuppressWarnings("unchecked")
		AtomicReference<Supplier<nortantis.MapCreator>> ref = (AtomicReference<Supplier<nortantis.MapCreator>>) f.get(null);
		ref.set(sup);

		MapSettings settings = SettingsGenerator.generate(new Random(7), Assets.installedArtPack, null);
		settings.edits = new nortantis.swing.MapEdits();
		settings.edits.centerEdits.put(0, new nortantis.editor.CenterEdit(0, false, false, null, null, null));

		// Build GenerationRequestContext
		// Build GenerationRequestContext via private helper buildContextFromNortBody
		ApiUtils.RandomMapParameters params = new ApiUtils.RandomMapParameters();
		Class<?> serverClass = Class.forName("nortantis.api.MapApiServer");

		// Create Context proxy to capture status
		final String[] recorded = new String[1];
		io.javalin.http.Context proxy = (io.javalin.http.Context) java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { io.javalin.http.Context.class },
				(proxyObj, method, args) ->
				{
					if ("status".equals(method.getName()) && args != null && args.length == 1)
					{
						recorded[0] = String.valueOf(args[0]);
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

		// build a body from settings JSON so buildContextFromNortBody produces a GenerationRequestContext with a non-null GenerationContext
		String body = settings.toJsonString();
		java.lang.reflect.Method buildNort = serverClass.getDeclaredMethod("buildContextFromNortBody", String.class, ApiUtils.RandomMapParameters.class, io.javalin.http.Context.class);
		buildNort.setAccessible(true);
		Object grc = buildNort.invoke(null, body, params, proxy);

		Class<?> c = serverClass;
		Method m = c.getDeclaredMethod("executeGenerationAndReturn", grc.getClass(), io.javalin.http.Context.class);
		m.setAccessible(true);
		Object result = m.invoke(null, grc, proxy);

		assertNotNull(result);
		String json = String.valueOf(result);
		assertEquals("500", recorded[0]);
		assertTrue(json.contains("\"success\":false") || json.contains("error") || json.contains("Failed to"));
	}
}

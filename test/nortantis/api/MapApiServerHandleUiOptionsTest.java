package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

class MapApiServerHandleUiOptionsTest
{
	@Test
	void testHandleUiOptionsReturnsUiJsonWithResources() throws Exception
	{
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());
		try (AutoCloseable installer = nortantis.TestTranslationBundleInstaller.installFakeBundle())
		{
			// Ensure Translation.effectiveLocale is set so ResourceBundle.getBundle isn't called with null
			Class<?> trClass = Class.forName("nortantis.swing.translation.Translation");
			java.lang.reflect.Field eff = trClass.getDeclaredField("effectiveLocale");
			eff.setAccessible(true);
			eff.set(null, java.util.Locale.ENGLISH);
			// Build a minimal Context proxy where queryParam returns null
			Class<?> ctxIface = Class.forName("io.javalin.http.Context");
			InvocationHandler handler = (proxy, method, args) ->
			{
				String name = method.getName();
				if ("queryParam".equals(name) && args != null && args.length >= 1)
				{
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

			Class<?> c = Class.forName("nortantis.api.MapApiServer");
			Method m = c.getDeclaredMethod("handleUiOptions", ctxIface);
			m.setAccessible(true);
			Object result = m.invoke(null, ctxProxy);

			assertNotNull(result);
			String json = String.valueOf(result);
			assertTrue(json.contains("artPacks"), "Expected artPacks in UI JSON");
			assertTrue(json.contains("books"), "Expected books in UI JSON");
			assertTrue(json.contains("cityIconTypesByPack"), "Expected cityIconTypesByPack in UI JSON");
		}
	}
}

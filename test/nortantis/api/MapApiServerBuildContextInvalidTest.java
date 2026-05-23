package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

class MapApiServerBuildContextInvalidTest
{
	@Test
	void testBuildContextFromNortBodyInvalidReturnsNullAndSets400() throws Exception
	{
		// Ensure platform available
		nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

		// Create a proxy Context to capture status
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		final String[] recorded = new String[1];
		InvocationHandler handler = (proxy, method, args) ->
		{
			if ("status".equals(method.getName()) && args != null && args.length == 1)
			{
				recorded[0] = String.valueOf(args[0]);
				return null;
			}
			return null;
		};

		Object ctxProxy = Proxy.newProxyInstance(getClass().getClassLoader(), new Class[] { ctxIface }, handler);

		Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");

		// Call with invalid body
		java.lang.reflect.Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("buildContextFromNortBody", String.class, paramsClass, ctxIface);
		m.setAccessible(true);
		Object result = m.invoke(null, "not a json", null, ctxProxy);

		assertNull(result, "Expected null GenerationRequestContext for invalid nort body");
		assertEquals("400", recorded[0]);
	}
}

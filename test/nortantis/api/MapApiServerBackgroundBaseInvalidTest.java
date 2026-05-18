package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

class MapApiServerBackgroundBaseInvalidTest
{
    @Test
    void testGenerateBaseImageAndWriteResponseMissingDimensionsSets400() throws Exception
    {
        nortantis.platform.PlatformFactory.setInstance(new nortantis.platform.awt.AwtFactory());

        Class<?> ctxIface = Class.forName("io.javalin.http.Context");
        final String[] recorded = new String[3]; // contentType, status, resultString

        InvocationHandler handler = (proxy, method, args) -> {
            String name = method.getName();
            if ("body".equals(name))
            {
                return "{}"; // missing width/height
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
                    recorded[2] = new String((byte[]) a0);
                }
                else if (a0 != null)
                {
                    recorded[2] = String.valueOf(a0);
                }
                return null;
            }
            return null;
        };

        Object ctxProxy = Proxy.newProxyInstance(getClass().getClassLoader(), new Class[]{ctxIface}, handler);

        java.lang.reflect.Method m = Class.forName("nortantis.api.MapApiServer").getDeclaredMethod("generateBaseImageAndWriteResponse", ctxIface);
        m.setAccessible(true);
        Object res = m.invoke(null, ctxProxy);

        assertNull(res);
        assertEquals("application/json", recorded[0]);
        assertEquals("400", recorded[1]);
        assertNotNull(recorded[2]);
        assertTrue(recorded[2].contains("Missing required fields"));
    }
}

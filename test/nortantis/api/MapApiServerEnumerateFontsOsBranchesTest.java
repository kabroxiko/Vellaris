package nortantis.api;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MapApiServerEnumerateFontsOsBranchesTest {
    @ParameterizedTest
    @ValueSource(strings = {"Mac OS X", "Windows 10", "Linux"})
    void testEnumerateFonts_forVariousOSes(String osName) throws Exception {
        String prev = System.getProperty("os.name");
        try {
            System.setProperty("os.name", osName);
            Class<?> cls = Class.forName("nortantis.api.MapApiServer");
            Method m = cls.getDeclaredMethod("enumerateFonts", Map.class);
            m.setAccessible(true);

            Map<String, Object> options = new LinkedHashMap<>();
            m.invoke(null, options);

            assertTrue(options.containsKey("fonts"));
        } finally {
            if (prev == null) System.clearProperty("os.name"); else System.setProperty("os.name", prev);
        }
    }
}

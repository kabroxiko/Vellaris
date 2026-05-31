package nortantis.api;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

class MapApiServerMoreCoverageTest {

	@Test
	void testReadFamilyFromStreamReturnsNullForNonFont() throws Exception {
		byte[] data = "this is not a ttf".getBytes();
		Method m = MapApiServer.class.getDeclaredMethod("readFamilyFromStream", java.io.InputStream.class);
		m.setAccessible(true);
		Object r = m.invoke(null, new ByteArrayInputStream(data));
		assertNull(r);
	}

	@Test
	void testDetectFontFamilyReturnsNullForGarbageFile() throws Exception {
		File tmp = File.createTempFile("garbage", ".ttf");
		tmp.deleteOnExit();
		try (FileOutputStream fos = new FileOutputStream(tmp)) {
			fos.write("not a font".getBytes());
		}
		Method m = MapApiServer.class.getDeclaredMethod("detectFontFamily", java.nio.file.Path.class);
		m.setAccessible(true);
		Object r = m.invoke(null, tmp.toPath());
		assertNull(r);
	}

	@Test
	void testSafeUrlDecodeHandlesNullAndEncoded() throws Exception {
		Method m = MapApiServer.class.getDeclaredMethod("safeUrlDecode", String.class);
		m.setAccessible(true);
		assertEquals("", m.invoke(null, (Object) null));
		assertEquals("A B.ttf", m.invoke(null, "A%20B.ttf"));
	}

	@Test
	void testNamedResourcesToListHandlesNullAndProducesResourceInfo() throws Exception {
		Method m = MapApiServer.class.getDeclaredMethod("namedResourcesToList", java.util.List.class);
		m.setAccessible(true);
		List<?> empty = (List<?>) m.invoke(null, (Object) null);
		assertNotNull(empty);
		assertTrue(empty.isEmpty());

		// Create a NamedResource and convert
		nortantis.NamedResource nr = new nortantis.NamedResource("pack1", "res1");
		List<?> out = (List<?>) m.invoke(null, Collections.singletonList(nr));
		assertEquals(1, out.size());
		Object ri = out.get(0);
		Method getArtPack = ri.getClass().getMethod("getArtPack");
		Method getName = ri.getClass().getMethod("getName");
		assertEquals("pack1", getArtPack.invoke(ri));
		assertEquals("res1", getName.invoke(ri));
	}

	@Test
	void testBuildWebUiOptionsReturnsMapContainingOptions() throws Exception {
		Method m = MapApiServer.class.getDeclaredMethod("buildWebUiOptions");
		m.setAccessible(true);
		@SuppressWarnings("unchecked")
		Map<String, Object> res = (Map<String, Object>) m.invoke(null);
		assertNotNull(res);
		assertTrue(res.containsKey("options"));
	}

	@Test
	void testReturnJsonResponseProducesImageBase64() throws Exception {
		PlatformFactory.setInstance(new AwtFactory());

		BufferedImage img = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
		// Use a generated, well-formed MapSettings to avoid serialization NPEs
		nortantis.MapSettings settings = nortantis.SettingsGenerator.generate(new java.util.Random(1), nortantis.util.Assets.installedArtPack, null);

		// Create a lightweight proxy for io.javalin.http.Context that only
		// supports contentType/status/result methods used by returnJsonResponse.
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		java.lang.reflect.InvocationHandler ih = (proxy, method, args) -> {
			String name = method.getName();
			if ("contentType".equals(name) || "result".equals(name)) {
				return proxy; // fluent API
			}
			if ("status".equals(name)) {
				return null;
			}
			throw new UnsupportedOperationException("Method not implemented: " + name);
		};

		Object ctx = java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { ctxIface }, ih);

		Method m = MapApiServer.class.getDeclaredMethod("returnJsonResponse", java.awt.image.BufferedImage.class, nortantis.MapSettings.class, ctxIface);
		m.setAccessible(true);
		Object result = m.invoke(null, img, settings, ctx);
		assertNotNull(result);
		String json = String.valueOf(result);
		assertTrue(json.contains("imageBase64"), "JSON should include imageBase64: " + json);
	}

	@Test
	void testPrepareGenerationRequestParsesNortJson() throws Exception {
		PlatformFactory.setInstance(new AwtFactory());

		// Create a minimal Context proxy that returns a MapSettings JSON body
		Class<?> ctxIface = Class.forName("io.javalin.http.Context");
		nortantis.MapSettings gen = nortantis.SettingsGenerator.generate(new java.util.Random(2), nortantis.util.Assets.installedArtPack, null);
		final String bodyJson = gen.toJsonString();
		java.lang.reflect.InvocationHandler ih = (proxy, method, args) -> {
			String name = method.getName();
			if ("body".equals(name)) {
				return bodyJson;
			}
			if ("contentType".equals(name) || "result".equals(name)) {
				return proxy;
			}
			if ("status".equals(name)) {
				return null;
			}
			throw new UnsupportedOperationException("Method not implemented: " + name);
		};
		Object ctx = java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { ctxIface }, ih);

		Method m = MapApiServer.class.getDeclaredMethod("prepareGenerationRequest", ctxIface, boolean.class);
		m.setAccessible(true);
		Object out = m.invoke(null, ctx, Boolean.TRUE);
		assertNotNull(out, "prepareGenerationRequest should return a context for valid JSON");

		// The returned object should be a GenerationRequestContext with a settings field
		Class<?> outClass = out.getClass();
		java.lang.reflect.Field settingsField = outClass.getDeclaredField("settings");
		settingsField.setAccessible(true);
		Object settings = settingsField.get(out);
		assertNotNull(settings, "Generated request context should contain settings");
	}
}

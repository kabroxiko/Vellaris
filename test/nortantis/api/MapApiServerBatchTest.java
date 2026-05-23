package nortantis.api;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.SettingsGenerator;
import nortantis.MapSettings;
import nortantis.util.Assets;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.platform.Image;
import nortantis.platform.ImageType;
import nortantis.MapCreator;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

/**
 * Batch test that exercises multiple MapApiServer helpers in a single JVM invocation. Run this when you want the focused tests to execute
 * together without repeated Gradle invocations.
 */
class MapApiServerBatchTest
{
	@Test
	void runFocusedMapApiServerChecks() throws Exception
	{
		// Basic params parsing check
		Object parseResult = MapApiServerParamsTest.MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "tryParseParams", new Class<?>[] { String.class }, "}{");
		assertNull(parseResult);

		// paramsContainGenerationFields
		Class<?> paramsClass = Class.forName("nortantis.api.ApiUtils$RandomMapParameters");
		Object params = paramsClass.getDeclaredConstructor().newInstance();
		Boolean initial = (Boolean) MapApiServerParamsTest.MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "paramsContainGenerationFields", new Class<?>[] { paramsClass }, params);
		assertFalse(initial);
		Field lang = paramsClass.getDeclaredField("language");
		lang.setAccessible(true);
		lang.set(params, "en");
		Boolean after = (Boolean) MapApiServerParamsTest.MethodInvoker.invokeStatic("nortantis.api.MapApiServer", "paramsContainGenerationFields", new Class<?>[] { paramsClass }, params);
		assertTrue(after);

		// UI/background helpers
		PlatformFactory.setInstance(new AwtFactory());
		Class<?> c = Class.forName("nortantis.api.MapApiServer");
		Method solid = c.getDeclaredMethod("generateSolidBackground", int.class, int.class);
		solid.setAccessible(true);
		Object img = solid.invoke(null, 32, 32);
		assertNotNull(img);
		if (img instanceof AutoCloseable)
			((AutoCloseable) img).close();

		Method base = c.getDeclaredMethod("generateBackgroundBaseImage", int.class, int.class, String.class, String.class, String.class);
		base.setAccessible(true);
		Object baseImg = base.invoke(null, 16, 16, null, null, null);
		assertNotNull(baseImg);
		if (baseImg instanceof AutoCloseable)
			((AutoCloseable) baseImg).close();

		// generateMap scenarios: primary success
		Field f = Class.forName("nortantis.api.MapApiServer").getDeclaredField("mapCreatorFactory");
		f.setAccessible(true);
		@SuppressWarnings("unchecked")
		java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>> ref = (java.util.concurrent.atomic.AtomicReference<Supplier<MapCreator>>) f.get(null);

		Supplier<MapCreator> supSuccess = () -> new MapCreator()
		{
			@Override
			public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
			{
				return Image.create(8, 8, ImageType.ARGB);
			}
		};
		ref.set(supSuccess);
		MapSettings settings = SettingsGenerator.generate(new Random(), Assets.installedArtPack, null);
		Method gen = c.getDeclaredMethod("generateMap", MapSettings.class, Integer.class, Integer.class);
		gen.setAccessible(true);
		Object res1 = gen.invoke(null, settings, null, null);
		Field imgField = res1.getClass().getDeclaredField("image");
		imgField.setAccessible(true);
		Object img1 = imgField.get(res1);
		assertNotNull(img1);
		((Image) img1).close();

		// primary fails, fallback succeeds
		AtomicInteger calls = new AtomicInteger(0);
		Supplier<MapCreator> supFailThenOk = () ->
		{
			if (calls.getAndIncrement() == 0)
			{
				return new MapCreator()
				{
					@Override
					public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
					{
						throw new RuntimeException("primary-failure");
					}
				};
			}
			else
			{
				return new MapCreator()
				{
					@Override
					public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
					{
						return Image.create(6, 6, ImageType.ARGB);
					}
				};
			}
		};
		ref.set(supFailThenOk);
		Object res2 = gen.invoke(null, settings, null, null);
		Field imgField2 = res2.getClass().getDeclaredField("image");
		imgField2.setAccessible(true);
		Object img2 = imgField2.get(res2);
		assertNotNull(img2);
		((Image) img2).close();

		// both fail
		Supplier<MapCreator> supAlwaysFail = () -> new MapCreator()
		{
			@Override
			public nortantis.platform.Image createMap(final nortantis.MapSettings settings, nortantis.geom.Dimension maxDimensions, nortantis.editor.MapParts mapParts)
			{
				throw new RuntimeException("always-fail");
			}
		};
		ref.set(supAlwaysFail);
		Object res3 = gen.invoke(null, settings, null, null);
		Field errField = res3.getClass().getDeclaredField("errorMessage");
		errField.setAccessible(true);
		Object errmsg = errField.get(res3);
		assertNotNull(errmsg);
	}
}

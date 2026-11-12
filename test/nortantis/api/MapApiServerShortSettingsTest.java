package nortantis.api;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import nortantis.GeneratedDimension;
import nortantis.LandShape;
import nortantis.MapSettings;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

/**
 * The short settings document is what a person fills in on the generator panel: dimension, world size, land shape, region count, city
 * frequency, art pack, city icon set and books. It names a kind of map rather than one specific map, so the generation endpoints expand it
 * into a full settings document instead of rejecting it for its missing fields.
 */
class MapApiServerShortSettingsTest
{
	private static final String SHORT_DOCUMENT = """
			{
			  "dimension": "Sixteen_by_9",
			  "worldSize": 28000,
			  "landShape": "Continents",
			  "regionCount": 11,
			  "drawRegionBoundaries": true,
			  "drawRegionColors": true,
			  "drawBorder": true,
			  "coastShadingLevel": 42,
			  "coastlineWidth": 2.7,
			  "lineStyle": "SplinesWithSmoothedCoastlines",
			  "drawGridOverlay": true,
			  "gridOverlayShape": "Horizontal hexes",
			  "gridOverlayRowOrColCount": 16,
			  "gridOverlayLineWidth": 3,
			  "gridOverlayLayer": "Under icons",
			  "drawVoronoiGridOverlayOnlyOnLand": true,
			  "cityProbability": 0.00625,
			  "artPack": "nortantis",
			  "cityIconSetName": "middle ages",
			  "books": ["Ancient Egypt", "Beowulf"]
			}
			""";

	@BeforeEach
	void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		installDummyTranslationBundle();
	}

	@Test
	void shortDocumentIsExpandedIntoFullSettings() throws Exception
	{
		Object context = prepare(SHORT_DOCUMENT, true);

		MapSettings settings = settingsOf(context);
		assertEquals(GeneratedDimension.Sixteen_by_9.width, settings.generatedWidth);
		assertEquals(GeneratedDimension.Sixteen_by_9.height, settings.generatedHeight);
		assertEquals(28000, settings.worldSize);
		assertEquals(LandShape.Continents, settings.landShape);
		assertEquals(11, settings.regionCount);
		assertTrue(settings.drawRegionColors);
		assertEquals(0.00625, settings.cityProbability, 1e-9);
		assertEquals("nortantis", settings.artPack);
		assertEquals("middle ages", settings.cityIconTypeName);
		assertEquals(2, settings.books.size());
		assertTrue(settings.books.contains("Ancient Egypt"));
		// It was answered by inventing settings, so the graph and the world description have to exist too.
		assertNotNull(generationContextOf(context), "a generated request must carry the context queries render from");
	}

	@Test
	void shortDocumentPinsTheRenderingTheGeneratorWouldRandomise() throws Exception
	{
		// Region boundaries, region colours, the border, shaded shores and a grid are drawn in only some of the generator's
		// draws; a document that names them must get them every time.
		MapSettings settings = settingsOf(prepare(SHORT_DOCUMENT, true));

		assertTrue(settings.drawRegionBoundaries);
		assertTrue(settings.drawRegionColors);
		assertTrue(settings.drawBorder);
		assertEquals(42, settings.coastShadingLevel);
		assertEquals(2.7, settings.coastlineWidth, 1e-9);
		assertEquals(MapSettings.LineStyle.SplinesWithSmoothedCoastlines, settings.lineStyle);
		assertTrue(settings.drawGridOverlay);
		// Names are read with the spaces the settings document writes, so "Horizontal hexes" and "Horizontal_hexes" both work.
		assertEquals(nortantis.GridOverlayShape.Horizontal_hexes, settings.gridOverlayShape);
		assertEquals(16, settings.gridOverlayRowOrColCount);
		assertEquals(3, settings.gridOverlayLineWidth);
		assertEquals(MapSettings.GridOverlayLayer.Under_icons, settings.gridOverlayLayer);
		assertTrue(settings.drawVoronoiGridOverlayOnlyOnLand);
	}

	@Test
	void anUnreadableNameKeepsTheGeneratorsChoice() throws Exception
	{
		String body = SHORT_DOCUMENT.replace("SplinesWithSmoothedCoastlines", "Not_A_Line_Style");

		MapSettings settings = settingsOf(prepare(body, true));

		assertNotNull(settings.lineStyle, "a value the generator does not know must not leave the setting empty");
	}

	@Test
	void aSeedInTheShortDocumentPinsTheWholeWorld() throws Exception
	{
		String body = SHORT_DOCUMENT.replaceFirst("\\{", "{\n  \"randomSeed\": 424242,");

		MapSettings settings = settingsOf(prepare(body, true));

		assertEquals(424242L, settings.randomSeed);
		assertEquals(424242L, settings.backgroundRandomSeed, "the background must belong to the same world");
		assertEquals(424242L, settings.regionsRandomSeed, "the regions must belong to the same world");
		assertEquals(424242L, settings.textRandomSeed, "the names must belong to the same world");
		assertEquals(424242L, settings.frayedBorderSeed, "the frayed border must belong to the same world");
	}

	@Test
	void aShortDocumentMayAskForABiggerPictureThanTheDimensionPreset() throws Exception
	{
		// A caller that shows the map large (a table zooming into it) needs more pixels than 4096; the dimension still names the
		// shape, so the world is the same one.
		String body = SHORT_DOCUMENT.replaceFirst("\\{", "{\n  \"generatedWidth\": 6144,\n  \"generatedHeight\": 3456,");

		MapSettings settings = settingsOf(prepare(body, true));

		assertEquals(6144, settings.generatedWidth);
		assertEquals(3456, settings.generatedHeight);
	}

	@Test
	void endpointsThatQueryAWorldRejectTheShortDocument() throws Exception
	{
		// A short document names no world, so answering it here would silently describe a different one than the caller means.
		assertNull(prepare(SHORT_DOCUMENT, false));
	}

	@Test
	void fullSettingsDocumentIsStillUsedAsWritten() throws Exception
	{
		MapSettings original = nortantis.SettingsGenerator.generate(new java.util.Random(3), nortantis.util.Assets.installedArtPack, null);
		original.randomSeed = 987654321L;
		original.worldSize = 7000;
		String body = original.toJsonString();

		MapSettings settings = settingsOf(prepare(body, true));

		assertEquals(987654321L, settings.randomSeed, "a document that carries its seeds must not be replaced by a random one");
		assertEquals(7000, settings.worldSize);
	}

	private Object prepare(String body, boolean acceptShortSettings) throws Exception
	{
		Class<?> ctxInterface = Class.forName("io.javalin.http.Context");
		Object ctx = java.lang.reflect.Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { ctxInterface }, (proxy, method, args) -> switch (method.getName())
		{
			case "body" -> body;
			case "contentType", "result" -> proxy;
			case "status" -> null;
			default -> throw new UnsupportedOperationException("Method not implemented: " + method.getName());
		});

		Method method = MapApiServer.class.getDeclaredMethod("prepareGenerationRequest", ctxInterface, boolean.class);
		method.setAccessible(true);
		return method.invoke(null, ctx, acceptShortSettings);
	}

	private static MapSettings settingsOf(Object requestContext) throws Exception
	{
		assertNotNull(requestContext, "the short document must be accepted by this endpoint");
		Field settingsField = requestContext.getClass().getDeclaredField("settings");
		settingsField.setAccessible(true);
		return (MapSettings) settingsField.get(requestContext);
	}

	private static Object generationContextOf(Object requestContext) throws Exception
	{
		Field ctxField = requestContext.getClass().getDeclaredField("ctx");
		ctxField.setAccessible(true);
		return ctxField.get(requestContext);
	}

	private static void installDummyTranslationBundle()
	{
		try
		{
			Class<?> translationClass = Class.forName("nortantis.i18n.Translation");
			Field bundleField = translationClass.getDeclaredField("bundle");
			bundleField.setAccessible(true);
			java.util.ResourceBundle fake = new java.util.ResourceBundle()
			{
				@Override
				protected Object handleGetObject(String key)
				{
					return key;
				}

				@Override
				public java.util.Enumeration<String> getKeys()
				{
					return java.util.Collections.enumeration(java.util.List.of());
				}
			};
			bundleField.set(null, fake);
		}
		catch (ReflectiveOperationException e)
		{
			fail("could not install the dummy translation bundle: " + e);
		}
	}
}

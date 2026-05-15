package nortantis.api;

import com.google.gson.Gson;
import nortantis.BackgroundGenerator;
import nortantis.FractalBGGenerator;
import nortantis.GeneratedDimension;
import nortantis.IconType;
import nortantis.ImageCache;
import nortantis.LandShape;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.NamedResource;
import nortantis.SettingsGenerator;
import nortantis.TextureSource;
import nortantis.editor.UserPreferences;
import nortantis.swing.translation.Translation;
import nortantis.util.Assets;
import nortantis.geom.Dimension;
import nortantis.platform.Image;
import nortantis.platform.ImageHelper;
import nortantis.platform.ImageType;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Logger;

import io.javalin.Javalin;
import io.javalin.http.Context;
import java.util.concurrent.CountDownLatch;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.awt.image.BufferedImage;
import java.util.Base64;
import java.util.List;
import java.util.Random;
import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.ResourceBundle;
import javax.imageio.ImageIO;
import javax.imageio.IIOImage;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.nio.file.Path;

// Replaced Spark Java handlers with Javalin

/**
 * Small HTTP API to generate random or .nort maps. POST /generate - body JSON: { "nortFile": "path.nort", "width":2000, "height":1200,
 * "seed":123, "out":"out.png" }
 */
public class MapApiServer
{

	private static final Gson gson = new Gson();

	private static final Random SHARED_RANDOM = new SecureRandom();
	private static final String CONTENT_TYPE_JSON = "application/json";
	private static final String CONTENT_TYPE_PNG = "image/png";
	private static final String PNG_FORMAT_NAME = "png";
	private static final String MSG_FAILED_TO_PARSE_CONFIG = "Failed to parse config";
	private static final float PNG_COMPRESSION_QUALITY = 0.95f;

	public static void main(String[] args)
	{
		CountDownLatch latch = new CountDownLatch(1);

		// Create and configure the Javalin app (Javalin 7 requires routes be
		// declared inside the config.routes block passed to create)
		Javalin app = Javalin.create(config ->
		{
			// Basic CORS handling equivalent to previous implementation
			config.routes.options("/*", ctx ->
			{
				String accessControlRequestHeaders = ctx.header("Access-Control-Request-Headers");
				if (accessControlRequestHeaders != null)
				{
					ctx.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
				}
				String accessControlRequestMethod = ctx.header("Access-Control-Request-Method");
				if (accessControlRequestMethod != null)
				{
					ctx.header("Access-Control-Allow-Methods", accessControlRequestMethod);
				}
				ctx.result("OK");
			});

			config.routes.before(ctx -> ctx.header("Access-Control-Allow-Origin", "*"));

			config.routes.get("/api/health", ctx -> ctx.result("ok"));

			// Simple resource list endpoints (removed)
			config.routes.get("/api/ui-options", ctx -> ctx.result(String.valueOf(handleUiOptions(ctx))));

			config.routes.post("/api/generate-settings", ctx -> ctx.result(String.valueOf(handleGenerateSettings(ctx))));
			config.routes.post("/api/generate", ctx -> ctx.result(String.valueOf(handleGenerate(ctx))));
			config.routes.post("/api/background-base", MapApiServer::handleBackgroundBase);

			config.routes.exception(Exception.class, (e, ctx) ->
			{
				Logger.println("Unhandled API exception: " + e);
				ctx.contentType(CONTENT_TYPE_JSON);
				ctx.status(500);
				ctx.result(gson.toJson(new ApiResponse(false, "Unhandled exception: " + formatExceptionMessage(e), null, null)));
			});
		});

		// Shutdown hook stops the app and signals the latch
		Runtime.getRuntime().addShutdownHook(new Thread(() ->
		{
			try
			{
				app.stop();
			}
			finally
			{
				latch.countDown();
			}
		}));

		try
		{
			app.start(8080);
			awaitLatch(latch);
		}
		catch (Exception e)
		{
			Logger.println("Error running server: " + e);
		}
	}

	private static void awaitLatch(CountDownLatch latch)
	{
		try
		{
			latch.await();
		}
		catch (InterruptedException ie)
		{
			Thread.currentThread().interrupt();
		}
	}

	// Extracted helper to reduce cognitive complexity in handleBackgroundBase.
	// Builds params, generates the background image and writes the PNG to the
	// response output stream. Returns the generated Image for the caller to
	// close/cleanup when appropriate.
	private static Image generateBaseImageAndWriteResponse(Context ctx) throws java.io.IOException
	{
		int width = -1;
		int height = -1;
		String type = null;
		String cityIconType = null;
		String artPack = null;

		try
		{
			@SuppressWarnings("unchecked")
			Map<String, Object> raw = gson.fromJson(ctx.body(), Map.class);
			if (raw != null)
			{
				Integer w = parseInteger(raw.get("width"));
				Integer h = parseInteger(raw.get("height"));
				if (w != null)
					width = w;
				if (h != null)
					height = h;
				Object t = raw.get("type");
				if (t != null)
					type = String.valueOf(t);
				Object ap = raw.get("artPack");
				if (ap != null)
					artPack = String.valueOf(ap);
				Object cit = raw.get("cityIconType");
				if (cit != null)
					cityIconType = String.valueOf(cit);
			}
		}
		catch (RuntimeException ignore)
		{
			// If mapping fails, fall through with defaults
		}

		if (width <= 0 || height <= 0)
		{
			ctx.contentType(CONTENT_TYPE_JSON);
			ctx.status(400);
			ctx.result(gson.toJson(new ApiResponse(false, "Missing required fields: width and height must be positive integers", null, null)));
			return null;
		}

		// `cityIconType` and `artPack` are optional; if absent the generator
		// will use defaults or fall back to a solid background.
		Image baseImage = generateBackgroundBaseImage(width, height, type, cityIconType, artPack);
		BufferedImage buffered = nortantis.platform.awt.AwtFactory.unwrap(baseImage);
		// Write compressed PNG into memory then set as result to avoid
		// directly depending on servlet response APIs.
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
		{
			writeCompressedPng(buffered, baos);
			baos.flush();
			ctx.contentType(CONTENT_TYPE_PNG);
			ctx.status(200);
			ctx.result(baos.toByteArray());
		}
		return baseImage;
	}

	private static Object handleGenerateSettings(Context ctx)
	{
		// request header logging removed

		GenerationRequestContext grc = prepareGenerationRequest(ctx, true);
		if (grc == null)
		{
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}
		MapSettings settings = grc.settings;

		// `settings` already contains any resolved language; no extra copy needed

		// Produce normalized settings map and canonical JSON to return to frontend.
		String rawJson = settings.toJsonString();
		@SuppressWarnings("unchecked")
		Map<String, Object> settingsMap = gson.fromJson(rawJson, Map.class);
		@SuppressWarnings("unchecked")
		Map<String, Object> normalized = (Map<String, Object>) normalizeNumbersInObject(settingsMap);

		// Ensure `books` arrays are sorted for deterministic output,
		// then sort keys recursively to produce a deterministic canonical JSON
		sortBooksInObject(normalized);
		Object sorted = sortKeysInObject(normalized);
		String normalizedJson = gson.toJson(sorted);

		// Return the canonical normalized .nort JSON directly as the response body
		// (clients expect raw .nort content, not a wrapper object).
		ctx.contentType(CONTENT_TYPE_JSON);
		return normalizedJson;
	}

	private static Object handleUiOptions(Context ctx)
	{
		ctx.contentType(CONTENT_TYPE_JSON);
		String requestedLanguage = ctx.queryParam("uiLanguage");
		applyRequestLanguage(requestedLanguage);

		// Ensure a platform implementation is available before any classes
		// that depend on PlatformFactory (e.g. Color) are initialized.
		PlatformFactory.setInstance(new AwtFactory());

		// Build the standard UI options/labels. Deterministic seed
		// support removed — defaults are always generated fresh.
		Map<String, Object> ui = buildWebUiOptions();

		// Also include resource lists so the frontend can fetch a single
		// endpoint for all initial UI state (art packs, books, textures,
		// border types, and city icon groups per art pack).
		try
		{
			List<String> artPacks = Assets.listArtPacks(false);
			ui.put("artPacks", artPacks);

			ui.put("books", SettingsGenerator.getAllBooks());

			ui.put("textures", namedResourcesToList(Assets.listBackgroundTexturesForAllArtPacks(null)));

			ui.put("borderTypes", namedResourcesToList(Assets.listAllBorderTypes(null)));

			// City icon groups per art pack (may be empty for some packs)
			Map<String, List<String>> cityIconTypesByPack = new LinkedHashMap<>();
			PlatformFactory.setInstance(new AwtFactory());
			for (String pack : artPacks)
			{
				cityIconTypesByPack.put(pack, getCityIconTypesForPack(pack));
			}
			ui.put("cityIconTypesByPack", cityIconTypesByPack);
		}
		catch (RuntimeException e)
		{
			// If resource enumeration fails, still return UI options.
			Logger.println("Failed to enumerate UI resources: " + e.getMessage());
		}

		return gson.toJson(ui);
	}

	private static String formatExceptionMessage(Exception exception)
	{
		if (exception == null)
		{
			return "unknown";
		}

		String message = exception.getMessage();
		if (message == null || message.isBlank())
		{
			return exception.getClass().getSimpleName();
		}

		return exception.getClass().getSimpleName() + " - " + message;
	}

	private static Object handleGenerate(Context ctx)
	{
		// request header logging removed

		GenerationRequestContext grc = prepareGenerationRequest(ctx, false);
		if (grc == null)
		{
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}

		try
		{
			return executeGenerationAndReturn(grc, ctx);
		}
		finally
		{
			// Do not modify or restore global UI language here; map generation
			// must not depend on or mutate UserPreferences.language.
		}
	}

	private static Object executeGenerationAndReturn(GenerationRequestContext grc, Context ctx)
	{
		GenerationContext genCtx = grc.ctx;
		MapSettings requestSettings = grc.settings;

		if (requestSettings != null && requestSettings.language != null && !requestSettings.language.isEmpty())
		{
			genCtx.settings.language = requestSettings.language;
		}

		// Use the MapSettings language for translations during generation
		// without mutating global UserPreferences (safe for concurrent API use).
		boolean appliedLanguage = false;
		if (requestSettings != null && requestSettings.language != null && !requestSettings.language.isEmpty())
		{
			Translation.initializeWithLanguage(requestSettings.language);
			appliedLanguage = true;
		}

		Integer gw = (requestSettings != null && requestSettings.generatedWidth > 0) ? Integer.valueOf(requestSettings.generatedWidth) : null;
		Integer gh = (requestSettings != null && requestSettings.generatedHeight > 0) ? Integer.valueOf(requestSettings.generatedHeight) : null;
		GenerationResult generation = generateMap(genCtx.settings, gw, gh);
		if (generation.image == null)
		{
			// restore translation state (re-initialize from UserPreferences)
			if (appliedLanguage)
			{
				Translation.initialize();
			}
			ctx.status(500);
			return gson.toJson(new ApiResponse(false, generation.errorMessage, null, null));
		}

		Image img = generation.image;
		try
		{
			return produceResponseFromImage(img, genCtx, ctx);
		}
		finally
		{
			img.close();
			if (appliedLanguage)
			{
				Translation.initialize();
			}
		}
	}

	// Helper to handle image -> JSON response conversion with centralized exception handling
	private static Object produceResponseFromImage(Image img, GenerationContext genCtx, Context ctx)
	{
		try
		{
			BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);
			return returnJsonResponse(buf, genCtx.settings, ctx);
		}
		catch (java.io.IOException ioe)
		{
			Logger.println("returnJsonResponse I/O failed: " + ioe);
			ctx.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to produce JSON response: " + ioe.getClass().getSimpleName() + (ioe.getMessage() != null ? (" - " + ioe.getMessage()) : ""), null, null));
		}
		catch (RuntimeException re)
		{
			Logger.println("returnJsonResponse failed: " + re);
			ctx.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to produce JSON response: " + re.getClass().getSimpleName() + (re.getMessage() != null ? (" - " + re.getMessage()) : ""), null, null));
		}
	}

	private static void applyRequestLanguage(String uiLanguage)
	{
		if (uiLanguage == null || uiLanguage.isEmpty())
		{
			return;
		}

		for (Locale locale : Translation.getSupportedLocales())
		{
			if (locale.getLanguage().equals(uiLanguage))
			{
				UserPreferences.getInstance().language = uiLanguage;
				Translation.initialize();
				return;
			}
		}
	}

	private static Map<String, Object> buildWebUiOptions()
	{
		Map<String, Object> options = new LinkedHashMap<>();
		populateStandardOptions(options);

		try
		{
			enumerateFonts(options);
		}
		catch (java.awt.HeadlessException | SecurityException e)
		{
			// ignore font enumeration failures
		}

		options.put("maxCityProbability", SettingsGenerator.maxCityProbability);
		populateGridOptions(options);

		Map<String, String> labels = loadLabels();

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("options", options);
		if (!labels.isEmpty())
			result.put("labels", labels);

		addDefaults(result);

		return result;
	}

	private static void populateStandardOptions(Map<String, Object> options)
	{
		options.put("tabs", List.of(option("background", tr("theme.tab.background")), option("border", tr("theme.tab.border")), option("effects", tr("theme.tab.effects")),
				option("fonts", tr("theme.tab.fonts"))));
		options.put("dimensions", List.of(option("Square", tr("GeneratedDimension.Square")), option("Sixteen_by_9", tr("GeneratedDimension.Sixteen_by_9")),
				option("Golden_Ratio", tr("GeneratedDimension.Golden_Ratio"))));
		options.put("landShapes", List.of(option("Continents", tr("LandShape.Continents")), option("Inland_Sea", tr("LandShape.Inland_Sea")), option("Scattered", tr("LandShape.Scattered"))));
		options.put("landColoringMethods", List.of(option("SingleColor", tr("LandColoringMethod.SingleColor")), option("ColorPoliticalRegions", tr("LandColoringMethod.ColorPoliticalRegions"))));
		options.put("backgroundTypes", List.of(option("FractalNoise", tr("theme.background.fractalNoise")), option("GeneratedFromTexture", tr("theme.background.generatedFromTexture")),
				option("SolidColor", tr("theme.background.solidColor"))));
		options.put("strokeTypes", List.of(option("Solid", tr("StrokeType.Solid")), option("Dashes", tr("StrokeType.Dashes")), option("Rounded_Dashes", tr("StrokeType.Rounded_Dashes")),
				option("Dots", tr("StrokeType.Dots"))));
		options.put("borderPositions", List.of(option("Outside_map", tr("BorderPosition.Outside_map")), option("Over_map", tr("BorderPosition.Over_map"))));
		options.put("borderColorOptions", List.of(option("Ocean_color", tr("BorderColorOption.Ocean_color")), option("Choose_color", tr("BorderColorOption.Choose_color"))));
		options.put("lineStyles", List.of(option("Jagged", tr("theme.lineStyle.jagged")), option("Splines", tr("theme.lineStyle.splines")),
				option("SplinesWithSmoothedCoastlines", tr("theme.lineStyle.splinesSmoothed"))));
		options.put("oceanWaveTypes",
				List.of(option("ConcentricWaves", tr("theme.waveType.concentricWaves")), option("Ripples", tr("theme.waveType.ripples")), option("None", tr("theme.waveType.none"))));
	}

	private static void populateGridOptions(Map<String, Object> options)
	{
		options.put("gridOverlayShapes", List.of(option("Horizontal_hexes", tr("GridOverlayShape.Horizontal_hexes")), option("Vertical_hexes", tr("GridOverlayShape.Vertical_hexes")),
				option("Squares", tr("GridOverlayShape.Squares")), option("Voronoi_polygons", tr("GridOverlayShape.Voronoi_polygons"))));
		options.put("gridOverlayOffsets", List.of(option("zero", tr("GridOverlayOffset.zero")), option("quarter", tr("GridOverlayOffset.quarter")), option("half", tr("GridOverlayOffset.half")),
				option("threeQuarters", tr("GridOverlayOffset.threeQuarters"))));
		options.put("gridOverlayLayers", List.of(option("Under_icons", tr("GridOverlayLayer.Under_icons")), option("Over_icons", tr("GridOverlayLayer.Over_icons"))));
	}

	private static void enumerateFonts(Map<String, Object> options)
	{
		java.awt.GraphicsEnvironment ge = java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment();
		String[] families = ge.getAvailableFontFamilyNames();

		java.util.List<String> hardcoded = new java.util.ArrayList<>();
		String osName = System.getProperty("os.name", "").toLowerCase();
		if (osName.contains("mac"))
		{
			java.util.Collections.addAll(hardcoded, "Apple Chancery", "Trajan Pro", "Optima", "Palatino", "Hoefler Text", "Garamond", "Times New Roman", "Georgia", "Baskerville");
		}
		else if (osName.contains("win"))
		{
			java.util.Collections.addAll(hardcoded, "Trajan Pro", "Garamond", "Times New Roman", "Palatino Linotype", "Book Antiqua", "Georgia", "Century Schoolbook");
		}
		else
		{
			java.util.Collections.addAll(hardcoded, "EB Garamond", "Libre Baskerville", "Gentium", "DejaVu Serif", "Cardo", "Cinzel", "Cormorant Garamond", "FreeSerif");
		}

		java.util.List<String> filtered = new java.util.ArrayList<>();
		for (String desired : hardcoded)
		{
			for (String inst : families)
			{
				if (inst.equalsIgnoreCase(desired))
				{
					filtered.add(inst);
					break;
				}
			}
		}

		options.put("fonts", filtered);
		if (!filtered.isEmpty())
			options.put("defaultFontFamily", filtered.get(0));
	}

	private static Map<String, String> loadLabels()
	{
		Map<String, String> labels = new LinkedHashMap<>();
		try
		{
			ResourceBundle bundle = ResourceBundle.getBundle("nortantis.swing.translation.messages", Translation.getEffectiveLocale());
			for (String k : bundle.keySet())
			{
				String v = bundle.getString(k);
				if (v != null)
					labels.put(k, v.trim());
			}
		}
		catch (java.util.MissingResourceException e)
		{
			// ignore missing translation bundle
		}
		return labels;
	}

	private static void addDefaults(Map<String, Object> result)
	{
		List<String> artPacks = Assets.listArtPacks(false);
		String artPack = (artPacks != null && !artPacks.isEmpty()) ? artPacks.get(0) : Assets.installedArtPack;

		MapSettings generated = SettingsGenerator.generate(SHARED_RANDOM, artPack, null);
		String defJson = generated.toJsonString();
		@SuppressWarnings("unchecked")
		Map<String, Object> defMap = gson.fromJson(defJson, Map.class);
		@SuppressWarnings("unchecked")
		Map<String, Object> normalized = (Map<String, Object>) normalizeNumbersInObject(defMap);
		result.put("defaults", normalized);
	}

	private static List<String> getCityIconTypesForPack(String pack)
	{
		try
		{
			return ImageCache.getInstance(pack, null).getIconGroupNames(IconType.cities);
		}
		catch (RuntimeException e)
		{
			return java.util.Collections.emptyList();
		}
	}

	// Convert a list of NamedResource into the lightweight map form used by the UI
	@SuppressWarnings("unused")
	private static class ResourceInfo
	{
		private final String artPack;
		private final String name;

		ResourceInfo(NamedResource r)
		{
			this.artPack = r.artPack;
			this.name = r.name;
		}

		public String getArtPack()
		{
			return artPack;
		}

		public String getName()
		{
			return name;
		}
	}

	// Convert a list of NamedResource into the lightweight POJO list used by the UI
	private static List<ResourceInfo> namedResourcesToList(List<NamedResource> resources)
	{
		List<ResourceInfo> out = new java.util.ArrayList<>();
		if (resources == null)
			return out;
		for (NamedResource r : resources)
		{
			out.add(new ResourceInfo(r));
		}
		return out;
	}


	// Recursively sort Map keys (lexicographically) so JSON serialization
	// produces deterministic canonical ordering. Lists are preserved and
	// non-container values are returned as-is.
	private static Object sortKeysInObject(Object o)
	{
		if (o == null)
			return null;
		if (o instanceof Map)
			return sortMap((Map<?, ?>) o);
		if (o instanceof List)
			return sortList((List<?>) o);
		return o;
	}

	private static Map<String, Object> sortMap(Map<?, ?> m)
	{
		java.util.TreeMap<String, Object> out = new java.util.TreeMap<>();
		for (Map.Entry<?, ?> e : m.entrySet())
		{
			String k = String.valueOf(e.getKey());
			out.put(k, sortKeysInObject(e.getValue()));
		}
		return out;
	}

	private static List<Object> sortList(List<?> l)
	{
		List<Object> out = new java.util.ArrayList<>(l.size());
		for (Object v : l)
			out.add(sortKeysInObject(v));
		return out;
	}

	// Recursively find any Map entries with key "books" whose value is a List
	// and sort that list lexicographically (by string value). This enforces a
	// deterministic ordering for the books array in returned .nort content.
	private static void sortBooksInObject(Object o)
	{
		if (o == null)
			return;
		if (o instanceof Map)
		{
			processMapForBooks((Map<?, ?>) o);
		}
		else if (o instanceof List)
		{
			for (Object v : (List<?>) o)
				sortBooksInObject(v);
		}
	}

	private static void processMapForBooks(Map<?, ?> m)
	{
		for (Map.Entry<?, ?> e : m.entrySet())
		{
			String k = String.valueOf(e.getKey());
			Object v = e.getValue();
			if ("books".equals(k) && v instanceof List)
			{
				sortBooksListInMap(m, k, v);
			}
			else
			{
				sortBooksInObject(v);
			}
		}
	}

	private static void sortBooksListInMap(Map<?, ?> m, String key, Object v)
	{
		try
		{
			@SuppressWarnings("unchecked")
			List<Object> lst = new java.util.ArrayList<>((List<Object>) v);
			lst.sort((a, b) -> String.valueOf(a).compareTo(String.valueOf(b)));
			@SuppressWarnings("unchecked")
			Map<String, Object> mm = (Map<String, Object>) m;
			mm.put(key, lst);
		}
		catch (ClassCastException | NullPointerException ignore)
		{
			// best-effort sorting; ignore malformed entries
		}
	}

	// Ensure numeric values that are whole numbers are represented as
	// integer types to avoid exponential/scientific notation when
	// serialized to JSON. This walks Maps and Lists recursively.
	private static Object normalizeNumbersInObject(Object o)
	{
		if (o == null)
			return null;
		if (o instanceof Map)
			return normalizeMap((Map<?, ?>) o);
		if (o instanceof List)
			return normalizeList((List<?>) o);
		if (o instanceof Number number)
			return normalizeNumber(number);
		return o;
	}

	private static Map<Object, Object> normalizeMap(Map<?, ?> m)
	{
		Map<Object, Object> out = new LinkedHashMap<>();
		for (Map.Entry<?, ?> e : m.entrySet())
		{
			Object k = e.getKey();
			Object v = e.getValue();
			out.put(k, normalizeNumbersInObject(v));
		}
		return out;
	}

	private static List<Object> normalizeList(List<?> l)
	{
		List<Object> out = new java.util.ArrayList<>(l.size());
		for (Object v : l)
			out.add(normalizeNumbersInObject(v));
		return out;
	}

	private static Object normalizeNumber(Number n)
	{
		if (n instanceof java.math.BigDecimal bd)
		{
			try
			{
				long lv = bd.longValueExact();
				if (lv >= Integer.MIN_VALUE && lv <= Integer.MAX_VALUE)
					return Integer.valueOf((int) lv);
				return Long.valueOf(lv);
			}
			catch (ArithmeticException ae)
			{
				return bd.doubleValue();
			}
		}
		if (n instanceof Double || n instanceof Float)
		{
			double d = n.doubleValue();
			if (Double.isFinite(d) && Math.floor(d) == d)
			{
				long lv = (long) d;
				if (lv >= Integer.MIN_VALUE && lv <= Integer.MAX_VALUE)
					return Integer.valueOf((int) lv);
				return Long.valueOf(lv);
			}
			return Double.valueOf(d);
		}
		return n;
	}

	private static Map<String, String> option(String value, String label)
	{
		Map<String, String> entry = new LinkedHashMap<>();
		entry.put("value", value);
		entry.put("label", label);
		return entry;
	}

	private static String tr(String key)
	{
		return Translation.get(key);
	}

	private static void handleBackgroundBase(Context ctx)
	{
		// This endpoint no longer depends on MapSettings. Accept a
		// small BackgroundBaseRequest JSON or multipart form with an optional
		// uploaded image part named "backgroundImage".
		PlatformFactory.setInstance(new AwtFactory());

		Image baseImage = null;
		try
		{
			// Delegate the heavy lifting to a helper to keep this method simple
			baseImage = generateBaseImageAndWriteResponse(ctx);
			// response already written to the output stream
		}
		catch (java.io.IOException | com.google.gson.JsonSyntaxException e)
		{
			Logger.println("handleBackgroundBase failed: " + e);
			ctx.contentType(CONTENT_TYPE_JSON);
			ctx.status(500);
			ctx.result(
					gson.toJson(new ApiResponse(false, "Failed to generate background base: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null)));
		}
		finally
		{
			if (baseImage != null)
				baseImage.close();
		}
	}

	// Helper to robustly parse an Integer from a loosely-typed JSON value.
	private static Integer parseInteger(Object v)
	{
		if (v == null)
			return null;
		if (v instanceof Number number)
			return number.intValue();
		try
		{
			return Integer.valueOf(String.valueOf(v));
		}
		catch (RuntimeException e)
		{
			return null;
		}
	}

	private static Image generateBackgroundBaseImage(int width, int height, String type, String cityIconType, String artPack)
	{
		if (type != null && "FractalNoise".equalsIgnoreCase(type))
		{
			return generateFractalBackground(width, height);
		}
		if (type != null && "GeneratedFromTexture".equalsIgnoreCase(type))
		{
			return generateBackgroundFromTexture(cityIconType, artPack, width, height);
		}
		return generateSolidBackground(width, height);
	}

	private static Image generateFractalBackground(int width, int height)
	{
		Image fractal = FractalBGGenerator.generate(SHARED_RANDOM, 1.3f, width, height, 0.75f);
		try
		{
			return fractal.deepCopy();
		}
		finally
		{
			fractal.close();
		}
	}

	private static Image generateBackgroundFromTexture(String cityIconType, String artPack, int width, int height)
	{
		Path texturePath = null;

		if (cityIconType != null)
		{
			String pack = artPack;
			if (pack == null || pack.isEmpty())
				pack = Assets.installedArtPack;
			NamedResource nr = new NamedResource(pack, cityIconType);
			texturePath = Assets.getBackgroundTextureResourcePath(nr, null);
		}

		if (texturePath == null)
		{
			Logger.println("Background texture not found: " + cityIconType + " (artPack=" + artPack + ") - falling back to solid background");
			return generateSolidBackground(width, height);
		}

		Image texture = ImageCache.getInstance(artPack, null).getImageFromFile(texturePath);
		try
		{
			Image textureForOcean = ImageHelper.getInstance().convertToGrayscale(texture);
			Image oceanBase = BackgroundGenerator.generateUsingWhiteNoiseConvolution(SHARED_RANDOM, textureForOcean, height, width);
			try
			{
				return oceanBase.deepCopy();
			}
			finally
			{
				oceanBase.close();
				if (textureForOcean != texture)
				{
					textureForOcean.close();
				}
			}
		}
		finally
		{
			texture.close();
		}
	}

	private static Image generateSolidBackground(int width, int height)
	{
		Image solid = Image.create(width, height, ImageType.Grayscale8Bit);
		try
		{
			return ImageHelper.getInstance().colorize(solid, nortantis.platform.Color.create(255, 255, 255), ImageHelper.ColorizeAlgorithm.solidColor);
		}
		finally
		{
			solid.close();
		}
	}

	// Extracted helper to satisfy Sonar S1141: keep nested try logic in a
	// separate method for clarity and single-responsibility.
	private static void ensureIconEditsFlag(MapSettings settings)
	{
		try
		{
			if (settings.edits != null)
			{
				// Only mark hasIconEdits true when centerEdits are present (initialized).
				// If only freeIcons are present without initialized centerEdits, the
				// editor state is incomplete and IconDrawer expects centerEdits to exist
				// for full-map icon updates. The frontend should send initialized
				// centerEdits when it intends to re-use edits; do not infer from
				// freeIcons alone to avoid NPEs in the generation pipeline.
				boolean hasCenterEdits = settings.edits.centerEdits != null && !settings.edits.centerEdits.isEmpty();
				if (hasCenterEdits)
				{
					settings.edits.hasIconEdits = true;
				}
			}
		}
		catch (NullPointerException ignore)
		{
			// best-effort; if this fails, default behavior remains unchanged
		}
	}

	private static MapSettings generateRandomMapSettings(RandomMapParameters params)
	{
		Random rand = SHARED_RANDOM;
		String artPack = (params.artPack != null && !params.artPack.isEmpty()) ? params.artPack : Assets.installedArtPack;
		MapSettings settings = SettingsGenerator.generate(rand, artPack, null);
		applyRandomMapParameterOverrides(params, settings);
		return settings;
	}

	private static void applyRandomMapParameterOverrides(RandomMapParameters p, MapSettings settings)
	{
		if (p.worldSize != null)
			settings.worldSize = p.worldSize;
		if (p.cityIconSetName != null && !p.cityIconSetName.isEmpty())
			settings.cityIconTypeName = p.cityIconSetName;
		if (p.landShape != null && !p.landShape.isEmpty())
		{
			try
			{
				settings.landShape = LandShape.valueOf(p.landShape);
			}
			catch (IllegalArgumentException ignored)
			{
				// Invalid landShape provided by client; ignore and keep generated default.
			}
		}
		if (p.regionCount != null)
			settings.regionCount = p.regionCount;
		if (p.cityFrequency != null)
			settings.cityProbability = p.cityFrequency / 100.0 * SettingsGenerator.maxCityProbability;
		if (p.books != null && !p.books.isEmpty())
			settings.books = new HashSet<>(p.books);
		applyDimensionOverride(p, settings);
		if (p.drawRegionColors != null)
			settings.drawRegionColors = p.drawRegionColors;
	}

	// Extracted dimension handling to reduce method cognitive complexity (Sonar S3776)
	private static void applyDimensionOverride(RandomMapParameters p, MapSettings settings)
	{
		if (p.dimension == null || p.dimension.isEmpty())
			return;
		try
		{
			GeneratedDimension dim = GeneratedDimension.valueOf(p.dimension);
			if (dim != GeneratedDimension.Custom)
			{
				settings.generatedWidth = dim.width;
				settings.generatedHeight = dim.height;
			}
		}
		catch (IllegalArgumentException ignored)
		{
			// Invalid dimension name supplied; ignore and keep generated/default dimensions.
		}
	}

	private static class RandomMapParameters
	{
		String language;
		String dimension;
		Integer worldSize;
		String landShape;
		Integer regionCount;
		Boolean drawRegionColors;
		Integer cityFrequency;
		List<String> books;
		String artPack;
		String cityIconSetName;
	}

	/**
	 * Internal helper holding parsed request context for generation endpoints.
	 */
	private static class GenerationRequestContext
	{
		GenerationContext ctx; // populated for endpoints that load settings from .nort
		MapSettings settings; // populated when settings are available directly
	}

	/**
	 * Parse request and prepare a GenerationRequestContext. If allowGenerateRandomSettings is true, the helper will generate random
	 * settings when params are provided and no settings are included. If false, the request must include settings (or an uploaded .nort)
	 * and the function will attempt to load them into a GenerationContext via loadSettings. Returns null and sets response status on error.
	 */
	private static GenerationRequestContext prepareGenerationRequest(Context ctx, boolean allowGenerateRandomSettings)
	{
		String body = ctx.body();
		if (body.isBlank())
		{
			ctx.status(400);
			return null;
		}

		PlatformFactory.setInstance(new AwtFactory());

		RandomMapParameters params = tryParseParams(body);

		if (allowGenerateRandomSettings && paramsContainGenerationFields(params))
		{
			return buildContextFromParams(params);
		}

		return buildContextFromNortBody(body, params, ctx);
	}

	// Helper: attempt to parse the request body as RandomMapParameters
	private static RandomMapParameters tryParseParams(String body)
	{
		try
		{
			return gson.fromJson(body, RandomMapParameters.class);
		}
		catch (com.google.gson.JsonSyntaxException e)
		{
			return null;
		}
	}

	// Helper: quick check whether parsed params contain any generation fields
	private static boolean paramsContainGenerationFields(RandomMapParameters p)
	{
		return p != null && (p.language != null || p.dimension != null || p.worldSize != null || p.landShape != null || p.regionCount != null || p.cityFrequency != null
				|| (p.books != null && !p.books.isEmpty()));
	}

	// Build GenerationRequestContext when params-driven generation is requested
	private static GenerationRequestContext buildContextFromParams(RandomMapParameters params)
	{
		GenerationRequestContext out = new GenerationRequestContext();
		out.settings = generateRandomMapSettings(params);
		if (params.language != null && !params.language.isEmpty())
		{
			out.settings.language = params.language;
		}
		return out;
	}

	// Build GenerationRequestContext by parsing JSON only. Reject non-JSON inputs.
	private static GenerationRequestContext buildContextFromNortBody(String body, RandomMapParameters params, Context ctx)
	{
		try
		{
			MapSettings settings = MapSettings.fromJson(body);
			ensureIconEditsFlag(settings);
			GenerationRequestContext out = new GenerationRequestContext();
			out.ctx = new GenerationContext(settings);
			out.settings = settings;
			if (params != null && params.language != null && !params.language.isEmpty())
			{
				out.settings.language = params.language;
			}
			return out;
		}
		catch (RuntimeException e)
		{
			// Parsing failed: enforce API contract by returning 400.
			ctx.status(400);
			return null;
		}
	}

	private static GenerationResult generateMap(MapSettings settings, Integer generatedWidth, Integer generatedHeight)
	{
		// Only pass explicit render dimensions to the map creator when the
		// caller provided `generatedWidth` or `generatedHeight`. The desktop
		// generator (CLI/UI) passes `null` when no explicit output size is
		// requested which influences resolution calculations; matching that
		// behavior here ensures generated worlds are consistent given the
		// same settings and seed.
		Dimension dims = (generatedWidth != null || generatedHeight != null) ? computeRenderDimensions(settings, generatedWidth, generatedHeight) : null;

		try
		{
			return attemptPrimaryRender(settings, dims);
		}
		catch (RuntimeException firstError)
		{
			Logger.println("generateMap primary render failed: " + firstError);
			return attemptFallbackRender(settings, dims, firstError);
		}
	}

	private static Dimension computeRenderDimensions(MapSettings settings, Integer generatedWidth, Integer generatedHeight)
	{
		// If the caller did not provide explicit width/height, prefer the
		// `generatedWidth`/`generatedHeight` from the loaded `.nort` settings
		// so maps loaded from files render at their intended resolution.
		int defaultWidth = settings.generatedWidth > 0 ? settings.generatedWidth : 2000;
		int defaultHeight = settings.generatedHeight > 0 ? settings.generatedHeight : 1200;
		int w = (generatedWidth != null) ? generatedWidth : defaultWidth;
		int h = (generatedHeight != null) ? generatedHeight : defaultHeight;
		return new Dimension(w, h);
	}

	private static GenerationResult attemptPrimaryRender(MapSettings settings, Dimension dims)
	{
		MapCreator creator = new MapCreator();
		Image image = creator.createMap(settings, dims, null);
		return GenerationResult.success(image);
	}

	private static GenerationResult attemptFallbackRender(MapSettings settings, Dimension dims, Exception firstError)
	{
		try
		{
			MapSettings fallback = prepareFallbackSettings(settings);
			MapCreator creator = new MapCreator();
			Image fallbackImage = creator.createMap(fallback, dims, null);
			return GenerationResult.success(fallbackImage);
		}
		catch (RuntimeException fallbackError)
		{
			Logger.println("generateMap fallback render failed: " + fallbackError);
			String message = buildErrorMessage(firstError, fallbackError);
			return GenerationResult.failure(message);
		}
	}

	private static MapSettings prepareFallbackSettings(MapSettings settings)
	{
		MapSettings fallback = settings.deepCopy();
		fallback.customImagesPath = "";

		if (fallback.artPack == null || fallback.artPack.equals(Assets.customArtPack))
		{
			fallback.artPack = Assets.installedArtPack;
		}

		disableFileTextureIfNeeded(fallback);
		disableCustomTextureIfNeeded(fallback);
		disableCustomBorderIfNeeded(fallback);

		return fallback;
	}

	private static void disableFileTextureIfNeeded(MapSettings fallback)
	{
		if (fallback.backgroundTextureSource == TextureSource.File)
		{
			fallback.generateBackgroundFromTexture = false;
			fallback.solidColorBackground = true;
			fallback.backgroundTextureImage = "";
		}
	}

	private static void disableCustomTextureIfNeeded(MapSettings fallback)
	{
		if (fallback.backgroundTextureResource != null && Assets.customArtPack.equals(fallback.backgroundTextureResource.artPack))
		{
			fallback.generateBackgroundFromTexture = false;
			fallback.solidColorBackground = true;
			fallback.backgroundTextureResource = null;
		}
	}

	private static void disableCustomBorderIfNeeded(MapSettings fallback)
	{
		if (fallback.borderResource != null && Assets.customArtPack.equals(fallback.borderResource.artPack))
		{
			fallback.drawBorder = false;
			fallback.borderResource = null;
		}
	}

	private static String buildErrorMessage(Exception firstError, Exception fallbackError)
	{
		return "Failed to generate map: " + fallbackError.getClass().getSimpleName() + (fallbackError.getMessage() != null ? (" - " + fallbackError.getMessage()) : "") + " (primary error: "
				+ firstError.getClass().getSimpleName() + (firstError.getMessage() != null ? (" - " + firstError.getMessage()) : "") + ")";
	}

	private static final int MAX_BASE64_PREVIEW_DIMENSION = 1920;

	private static Object returnJsonResponse(BufferedImage buf, MapSettings settings, Context ctx) throws IOException
	{
		buf = scaleImageIfNeeded(buf);
		byte[] bytes = serializeImageToBytes(buf);
		String nortContent = resolveBestNortContent(settings);

		// Parse canonical settings into a map, attach imageBase64, and return
		@SuppressWarnings("unchecked")
		Map<String, Object> settingsMap = gson.fromJson(nortContent, Map.class);
		if (settingsMap == null)
			settingsMap = new LinkedHashMap<>();
		settingsMap.put("imageBase64", Base64.getEncoder().encodeToString(bytes));

		ctx.contentType(CONTENT_TYPE_JSON);
		ctx.status(200);
		return gson.toJson(settingsMap);
	}

	private static BufferedImage scaleImageIfNeeded(BufferedImage buf)
	{
		if (buf.getWidth() > MAX_BASE64_PREVIEW_DIMENSION || buf.getHeight() > MAX_BASE64_PREVIEW_DIMENSION)
		{
			double scale = Math.min((double) MAX_BASE64_PREVIEW_DIMENSION / buf.getWidth(), (double) MAX_BASE64_PREVIEW_DIMENSION / buf.getHeight());
			int previewWidth = (int) (buf.getWidth() * scale);
			int previewHeight = (int) (buf.getHeight() * scale);
			BufferedImage scaled = new BufferedImage(previewWidth, previewHeight, buf.getType());
			java.awt.Graphics2D g = scaled.createGraphics();
			g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g.drawImage(buf, 0, 0, previewWidth, previewHeight, null);
			g.dispose();
			return scaled;
		}
		return buf;
	}

	private static byte[] serializeImageToBytes(BufferedImage buf) throws IOException
	{
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
		{
			writeCompressedPng(buf, baos);
			baos.flush();
			return baos.toByteArray();
		}
	}

	private static String resolveBestNortContent(MapSettings settings)
	{
		// Ensure edits arrays are populated so clients receive usable editor
		// state in the returned .nort. If edits are not initialized, create a
		// temporary graph and initialize center/edge/region edits from it.
		try
		{
			if (settings.edits == null || !settings.edits.isInitialized())
			{
				initializeEditsFromGraph(settings);
			}
		}
		catch (Exception e)
		{
			// Best-effort only; avoid failing the whole request for this step.
			Logger.println("Unexpected error while preparing nort content: " + e);
		}

		// Return the canonical JSON serialization of settings.
		return settings.toJsonString();
	}

	private static void initializeEditsFromGraph(MapSettings settings)
	{
		try
		{
			nortantis.WorldGraph graph = MapCreator.createGraphForUnitTests(settings);
			try
			{
				if (settings.edits == null)
					settings.edits = new nortantis.swing.MapEdits();
				settings.edits.initializeCenterEdits(graph.centers);
				settings.edits.initializeEdgeEdits(graph.edges);
				settings.edits.initializeRegionEdits(graph.regions.values());
			}
			finally
			{
				// no explicit close needed for WorldGraph
			}
		}
		catch (RuntimeException e)
		{
			// If graph creation fails, fall back to serializing settings as-is
			Logger.println("Failed to initialize edits for export: " + e);
		}
	}


	private static void writeCompressedPng(BufferedImage image, OutputStream outputStream) throws IOException
	{
		java.util.Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(PNG_FORMAT_NAME);
		if (!writers.hasNext())
		{
			ImageIO.write(image, PNG_FORMAT_NAME, outputStream);
			return;
		}

		ImageWriter writer = writers.next();
		try (ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream))
		{
			writer.setOutput(imageOutputStream);
			ImageWriteParam param = writer.getDefaultWriteParam();
			if (param.canWriteCompressed())
			{
				param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
				param.setCompressionQuality(PNG_COMPRESSION_QUALITY);
			}
			writer.write(null, new IIOImage(image, null, null), param);
		}
		finally
		{
			writer.dispose();
		}
	}

	private static class GenerationContext
	{
		MapSettings settings;

		GenerationContext(MapSettings settings)
		{
			this.settings = settings;
		}
	}

	private static class GenerationResult
	{
		Image image;
		String errorMessage;

		static GenerationResult success(Image image)
		{
			GenerationResult result = new GenerationResult();
			result.image = image;
			return result;
		}

		static GenerationResult failure(String errorMessage)
		{
			GenerationResult result = new GenerationResult();
			result.errorMessage = errorMessage;
			return result;
		}
	}


	@SuppressWarnings("unused")
	private static class ApiResponse
	{
		boolean success;
		String message;
		String path;
		String nortPath;

		ApiResponse(boolean success, String message, String path, String nortPath)
		{
			this.success = success;
			this.message = message;
			this.path = path;
			this.nortPath = nortPath;
		}
	}

	@SuppressWarnings("unused")
	private static class ImageAndSettingsResponse
	{
		String imageBase64;
		String nortContent;

		ImageAndSettingsResponse(String imageBase64, String nortContent)
		{
			this.imageBase64 = imageBase64;
			this.nortContent = nortContent;
		}
	}

	@SuppressWarnings("unused")
	private static class ResolvedSettingsResponse
	{
		Map<String, Object> settings;
		Map<String, Object> uiDefaults;
		String nortContent;

		ResolvedSettingsResponse(Map<String, Object> settings, Map<String, Object> uiDefaults, String nortContent)
		{
			this.settings = settings;
			this.uiDefaults = uiDefaults;
			this.nortContent = nortContent;
		}
	}

}

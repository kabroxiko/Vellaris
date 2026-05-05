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
import nortantis.Stroke;
import nortantis.StrokeType;
import nortantis.GridOverlayShape;
import nortantis.GridOverlayOffset;
import nortantis.TextureSource;
import nortantis.editor.UserPreferences;
import nortantis.swing.translation.Translation;
import nortantis.util.Assets;
import nortantis.platform.Color;
import nortantis.platform.Font;
import nortantis.geom.Dimension;
import nortantis.platform.Image;
import nortantis.platform.ImageHelper;
import nortantis.platform.ImageType;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Logger;
import nortantis.util.Tuple2;
import spark.Request;
import spark.Response;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.awt.image.BufferedImage;
import java.util.Base64;
import java.util.List;
import java.util.Random;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.charset.StandardCharsets;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import java.io.InputStream;
import java.nio.file.StandardCopyOption;

import static spark.Spark.*;

/**
 * Small HTTP API to generate random or .nort maps. POST /generate - body JSON: { "nortFile": "path.nort", "width":2000, "height":1200,
 * "seed":123, "out":"out.png" }
 */
public class MapApiServer
{

	private static final Gson gson = new Gson();
	private static final boolean API_DEBUG = true;
	private static final String CONTENT_TYPE_JSON = "application/json";
	private static final String CONTENT_TYPE_PNG = "image/png";
	private static final String PNG_FORMAT_NAME = "png";
	private static final String ART_PACK = "artPack";
	private static final String NORT_EXTENSION = ".nort";
	private static final String MSG_FAILED_TO_PARSE_CONFIG = "Failed to parse config";
	private static final String MSG_FAILED_TO_LOAD_SETTINGS = "Failed to load settings";
	private static final float PNG_COMPRESSION_QUALITY = 0.95f;
	private static final int DEFAULT_BACKGROUND_PREVIEW_WIDTH = 320;
	private static final int DEFAULT_BACKGROUND_PREVIEW_HEIGHT = 110;

	public static void main(String[] args)
	{
		port(8080);
		setupCors();
		get("/api/health", (req, res) -> "ok");

		// Simple resource list endpoints
		registerSimpleLists();

		get("/api/ui-options", MapApiServer::handleUiOptions);

		post("/api/generate-settings", MapApiServer::handleGenerateSettings);
		post("/api/generate", MapApiServer::handleGenerate);
		post("/api/background-base", MapApiServer::handleBackgroundBase);

		exception(Exception.class, (exception, req, res) ->
		{
			Logger.println("Unhandled API exception: " + exception);
			res.type(CONTENT_TYPE_JSON);
			res.status(500);
			res.body(gson.toJson(new ApiResponse(false, "Unhandled exception: " + formatExceptionMessage(exception), null, null)));
		});

		init();
		if (API_DEBUG) Logger.println("Map API server started on port 8080");
	}

	private static Object handleGenerateSettings(Request req, Response res)
	{
		res.type(CONTENT_TYPE_JSON);
		logHeaders(req);

		Config cfg = parseConfig(req, res);
		RandomMapParameters params = parseRandomMapParameters(req, res);
		if (cfg == null && params == null)
		{
			res.status(400);
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}

		PlatformFactory.setInstance(new AwtFactory());
		String previousLanguage = UserPreferences.getInstance().language;
			String generationLanguage = (cfg != null) ? resolveGenerationLanguage(cfg) : null;
		if ((generationLanguage == null || generationLanguage.isEmpty()) && params != null)
		{
				generationLanguage = (params.mapLanguage != null && !params.mapLanguage.isEmpty()) ? params.mapLanguage : params.uiLanguage;
		}
		applyRequestLanguage(generationLanguage);

		try
		{
			MapSettings settings;
			if (params != null && (cfg == null || (cfg.settings == null && (cfg.nortFile == null || cfg.nortFile.isEmpty()))))
			{
				settings = generateRandomMapSettings(params);
				applyCommonSettings(cfg != null ? cfg : new Config(), settings);
				applyThemeOverrides(cfg != null ? cfg : new Config(), settings);
			}
			else
			{
				GenerationContext ctx = loadSettings(cfg, res);
				if (ctx == null)
				{
					res.status(400);
					return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_LOAD_SETTINGS, null, null));
				}
				settings = ctx.settings;
			}

			// Ensure returned settings include the resolved generation language
			if (generationLanguage != null && !generationLanguage.isEmpty()) {
				settings.language = generationLanguage;
			}

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
			res.type(CONTENT_TYPE_JSON);
			return normalizedJson;
		}
		finally
		{
			restorePreviousLanguage(previousLanguage);
		}
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

	private static Object handleGenerate(Request req, Response res)
	{
		res.type(CONTENT_TYPE_JSON);
		logHeaders(req);

		Config cfg = parseConfig(req, res);
		RandomMapParameters params = parseRandomMapParameters(req, res);
		if (cfg == null && params == null)
		{
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}

		PlatformFactory.setInstance(new AwtFactory());
		String previousLanguage = UserPreferences.getInstance().language;
		// Prefer explicit language from Config; fall back to RandomMapParameters when present
		String generationLanguage = (cfg != null) ? resolveGenerationLanguage(cfg) : null;
		if ((generationLanguage == null || generationLanguage.isEmpty()) && params != null)
		{
				generationLanguage = (params.mapLanguage != null && !params.mapLanguage.isEmpty()) ? params.mapLanguage : params.uiLanguage;
		}
		applyRequestLanguage(generationLanguage);

		try
		{
			GenerationContext ctx;
			Config effectiveCfg = (cfg != null) ? cfg : new Config();

			// Require pregenerated settings (returned by /api/generate-settings)
			// or an uploaded .nort file / full settings JSON. Do not generate
			// new random settings here; callers should call /api/generate-settings
			// first and then POST the returned normalized .nort as `cfg.settings`.
			if (cfg == null || (cfg.settings == null && (cfg.nortFile == null || cfg.nortFile.isEmpty())))
			{
				res.status(400);
				return gson.toJson(new ApiResponse(false, "Missing settings: POST the normalized .nort (from /api/generate-settings) or upload a .nort file", null, null));
			}

			ctx = loadSettings(cfg, res);
			if (ctx == null)
			{
				return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_LOAD_SETTINGS, null, null));
			}

			// Ensure the settings object records the resolved generation language
			// so downstream components that read settings.language can observe it.
			if (generationLanguage != null && !generationLanguage.isEmpty()) {
				ctx.settings.language = generationLanguage;
			}

			// If the loaded settings contain a language, apply it to the
			// runtime so Translation/NameCreator use the requested locale.
			if (ctx.settings.language != null && !ctx.settings.language.isEmpty()) {
				applyRequestLanguage(ctx.settings.language);
			}

			// Debug logging to help trace language propagation during generation
			if (API_DEBUG) Logger.println("Generation language resolved: " + generationLanguage + ", settings.language: " + ctx.settings.language + ", effective applied language: " + UserPreferences.getInstance().language);
				GenerationResult generation = generateMap(ctx.settings, effectiveCfg);
					if (generation.image == null)
					{
						res.status(500);
						return gson.toJson(new ApiResponse(false, generation.errorMessage, null, null));
					}
					Image img = generation.image;
			// Always return JSON containing the image (base64) and the
			// merged .nort settings so clients can retrieve edits.
				try {
					BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);
					return returnJsonResponse(buf, ctx.settings, effectiveCfg, res);
				} catch (Exception e) {
					Logger.println("returnJsonResponse failed: " + e);
					res.status(500);
					return gson.toJson(new ApiResponse(false, "Failed to produce JSON response: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null));
				} finally {
					img.close();
					cleanupTempNortPath(ctx.tempNortPath, effectiveCfg);
				}
		}
		finally
		{
			restorePreviousLanguage(previousLanguage);
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

	private static String resolveGenerationLanguage(Config cfg)
	{
		if (cfg == null)
		{
			return null;
		}

		// Prefer an explicit `language` included inside provided settings JSON
		if (cfg.settings != null && cfg.settings.containsKey("language")) {
			Object lang = cfg.settings.get("language");
			if (lang instanceof String && !((String) lang).isEmpty()) return (String) lang;
		}

		// Fall back to the legacy mapLanguage query/form parameter if provided
		if (cfg.mapLanguage != null && !cfg.mapLanguage.isEmpty())
		{
			return cfg.mapLanguage;
		}

		return cfg.uiLanguage;
	}

	private static void restorePreviousLanguage(String previousLanguage)
	{
		UserPreferences.getInstance().language = previousLanguage;
		Translation.initialize();
	}

	private static Map<String, Object> buildWebUiOptions()
	{
		Map<String, Object> options = new LinkedHashMap<>();
		populateStandardOptions(options);

		try {
			enumerateFonts(options);
		} catch (Exception e) {
			if (API_DEBUG) Logger.println("Failed to enumerate system fonts: " + e.getMessage());
		}

		options.put("maxCityProbability", SettingsGenerator.maxCityProbability);
		populateGridOptions(options);

		Map<String, String> labels = loadLabels();

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("options", options);
		if (!labels.isEmpty()) result.put("labels", labels);

		try {
			addDefaults(result);
		} catch (Exception e) {
			if (API_DEBUG) Logger.println("Failed to produce UI defaults: " + e.getMessage());
		}

		return result;
	}

	private static void populateStandardOptions(Map<String, Object> options) {
		options.put("tabs", List.of(option("background", tr("theme.tab.background")), option("border", tr("theme.tab.border")),
				option("effects", tr("theme.tab.effects")), option("fonts", tr("theme.tab.fonts"))));
		options.put("dimensions", List.of(option("Square", tr("GeneratedDimension.Square")), option("Sixteen_by_9", tr("GeneratedDimension.Sixteen_by_9")),
				option("Golden_Ratio", tr("GeneratedDimension.Golden_Ratio"))));
		options.put("landShapes", List.of(option("Continents", tr("LandShape.Continents")), option("Inland_Sea", tr("LandShape.Inland_Sea")),
				option("Scattered", tr("LandShape.Scattered"))));
		options.put("landColoringMethods", List.of(option("SingleColor", tr("LandColoringMethod.SingleColor")),
				option("ColorPoliticalRegions", tr("LandColoringMethod.ColorPoliticalRegions"))));
		options.put("backgroundTypes", List.of(option("FractalNoise", tr("theme.background.fractalNoise")),
				option("GeneratedFromTexture", tr("theme.background.generatedFromTexture")), option("SolidColor", tr("theme.background.solidColor"))));
		options.put("strokeTypes", List.of(option("Solid", tr("StrokeType.Solid")), option("Dashes", tr("StrokeType.Dashes")),
				option("Rounded_Dashes", tr("StrokeType.Rounded_Dashes")), option("Dots", tr("StrokeType.Dots"))));
		options.put("borderPositions", List.of(option("Outside_map", tr("BorderPosition.Outside_map")), option("Over_map", tr("BorderPosition.Over_map"))));
		options.put("borderColorOptions", List.of(option("Ocean_color", tr("BorderColorOption.Ocean_color")), option("Choose_color", tr("BorderColorOption.Choose_color"))));
		options.put("lineStyles", List.of(option("Jagged", tr("theme.lineStyle.jagged")), option("Splines", tr("theme.lineStyle.splines")),
				option("SplinesWithSmoothedCoastlines", tr("theme.lineStyle.splinesSmoothed"))));
		options.put("oceanWaveTypes", List.of(option("ConcentricWaves", tr("theme.waveType.concentricWaves")), option("Ripples", tr("theme.waveType.ripples")),
				option("None", tr("theme.waveType.none"))));
	}

	private static void populateGridOptions(Map<String, Object> options) {
		options.put("gridOverlayShapes", List.of(option("Horizontal_hexes", tr("GridOverlayShape.Horizontal_hexes")), option("Vertical_hexes", tr("GridOverlayShape.Vertical_hexes")), option("Squares", tr("GridOverlayShape.Squares")), option("Voronoi_polygons", tr("GridOverlayShape.Voronoi_polygons"))));
		options.put("gridOverlayOffsets", List.of(option("zero", tr("GridOverlayOffset.zero")), option("quarter", tr("GridOverlayOffset.quarter")), option("half", tr("GridOverlayOffset.half")), option("threeQuarters", tr("GridOverlayOffset.threeQuarters"))));
		options.put("gridOverlayLayers", List.of(option("Under_icons", tr("GridOverlayLayer.Under_icons")), option("Over_icons", tr("GridOverlayLayer.Over_icons"))));
	}

	private static void enumerateFonts(Map<String, Object> options) {
		java.awt.GraphicsEnvironment ge = java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment();
		String[] families = ge.getAvailableFontFamilyNames();

		java.util.List<String> hardcoded = new java.util.ArrayList<>();
		String osName = System.getProperty("os.name", "").toLowerCase();
		if (osName.contains("mac")) {
			java.util.Collections.addAll(hardcoded, "Apple Chancery", "Trajan Pro", "Optima", "Palatino", "Hoefler Text", "Garamond", "Times New Roman", "Georgia", "Baskerville");
		} else if (osName.contains("win")) {
			java.util.Collections.addAll(hardcoded, "Trajan Pro", "Garamond", "Times New Roman", "Palatino Linotype", "Book Antiqua", "Georgia", "Century Schoolbook");
		} else {
			java.util.Collections.addAll(hardcoded, "EB Garamond", "Libre Baskerville", "Gentium", "DejaVu Serif", "Cardo", "Cinzel", "Cormorant Garamond", "FreeSerif");
		}

		java.util.List<String> filtered = new java.util.ArrayList<>();
		for (String desired : hardcoded) {
			for (String inst : families) {
				if (inst.equalsIgnoreCase(desired)) {
					filtered.add(inst);
					break;
				}
			}
		}

		options.put("fonts", filtered);
		if (!filtered.isEmpty()) options.put("defaultFontFamily", filtered.get(0));
	}

	private static Map<String, String> loadLabels() {
		Map<String, String> labels = new LinkedHashMap<>();
		try {
			ResourceBundle bundle = ResourceBundle.getBundle("nortantis.swing.translation.messages", Translation.getEffectiveLocale());
			for (String k : bundle.keySet()) {
				String v = bundle.getString(k);
				if (v != null) labels.put(k, v.trim());
			}
		} catch (Exception e) {
			if (API_DEBUG) Logger.println("Failed to load translation bundle: " + e.getMessage());
		}
		return labels;
	}

	private static void addDefaults(Map<String, Object> result) throws Exception {
		List<String> artPacks = Assets.listArtPacks(false);
		String artPack = (artPacks != null && !artPacks.isEmpty()) ? artPacks.get(0) : Assets.installedArtPack;

		Random rand = new Random();
		MapSettings generated = SettingsGenerator.generate(rand, artPack, null);
		String defJson = generated.toJsonString();
		@SuppressWarnings("unchecked")
		Map<String, Object> defMap = gson.fromJson(defJson, Map.class);
		@SuppressWarnings("unchecked")
		Map<String, Object> normalized = (Map<String, Object>) normalizeNumbersInObject(defMap);
		result.put("defaults", normalized);
	}

	private static List<String> getCityIconTypesForPack(String pack) {
		try {
			return ImageCache.getInstance(pack, null).getIconGroupNames(IconType.cities);
		} catch (Exception e) {
			return java.util.Collections.emptyList();
		}
	}

// Extracted helpers to keep `main` small and focused.
private static void setupCors()
{
	// Basic CORS
	options("/*", (request, response) ->
	{
		String accessControlRequestHeaders = request.headers("Access-Control-Request-Headers");
		if (accessControlRequestHeaders != null)
		{
			response.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
		}
		String accessControlRequestMethod = request.headers("Access-Control-Request-Method");
		if (accessControlRequestMethod != null)
		{
			response.header("Access-Control-Allow-Methods", accessControlRequestMethod);
		}
		return "OK";
	});
	before((req, res) -> res.header("Access-Control-Allow-Origin", "*"));
}

private static void registerSimpleLists()
{
	get("/api/art-packs", MapApiServer::handleArtPacks);
	get("/api/books", MapApiServer::handleBooks);
	get("/api/textures", MapApiServer::handleTextures);
	get("/api/border-types", MapApiServer::handleBorderTypes);
}

private static Object handleArtPacks(Request req, Response res)
{
	res.type(CONTENT_TYPE_JSON);
	return gson.toJson(Assets.listArtPacks(false));
}

private static Object handleBooks(Request req, Response res)
{
	res.type(CONTENT_TYPE_JSON);
	return gson.toJson(SettingsGenerator.getAllBooks());
}

private static Object handleTextures(Request req, Response res)
{
	res.type(CONTENT_TYPE_JSON);
	List<NamedResource> textures = Assets.listBackgroundTexturesForAllArtPacks(null);
	List<Map<String, String>> result = new java.util.ArrayList<>();
	for (NamedResource t : textures)
	{
		Map<String, String> entry = new LinkedHashMap<>();
		entry.put(ART_PACK, t.artPack);
		entry.put("name", t.name);
		result.add(entry);
	}
	return gson.toJson(result);
}

private static Object handleBorderTypes(Request req, Response res)
{
	res.type(CONTENT_TYPE_JSON);
	List<NamedResource> borderTypes = Assets.listAllBorderTypes(null);
	List<Map<String, String>> result = new java.util.ArrayList<>();
	for (NamedResource borderType : borderTypes)
	{
		Map<String, String> entry = new LinkedHashMap<>();
		entry.put(ART_PACK, borderType.artPack);
		entry.put("name", borderType.name);
		result.add(entry);
	}
	return gson.toJson(result);
}

private static Object handleUiOptions(Request req, Response res)
{
	res.type(CONTENT_TYPE_JSON);
	String requestedLanguage = req.queryParams("uiLanguage");
	String previousLanguage = UserPreferences.getInstance().language;
	applyRequestLanguage(requestedLanguage);

	// Ensure a platform implementation is available before any classes
	// that depend on PlatformFactory (e.g. Color) are initialized.
	PlatformFactory.setInstance(new AwtFactory());

	try
	{
		// Build the standard UI options/labels. Deterministic seed
		// support removed — defaults are always generated fresh.
		Map<String, Object> ui = buildWebUiOptions();

		// Also include resource lists so the frontend can fetch a single
		// endpoint for all initial UI state (art packs, books, textures,
		// border types, and city icon groups per art pack).
		try {
			List<String> artPacks = Assets.listArtPacks(false);
			ui.put("artPacks", artPacks);

			ui.put("books", SettingsGenerator.getAllBooks());

			List<NamedResource> textures = Assets.listBackgroundTexturesForAllArtPacks(null);
			List<Map<String,String>> texturesResult = new java.util.ArrayList<>();
			for (NamedResource t : textures) {
				Map<String,String> entry = new LinkedHashMap<>();
				entry.put("artPack", t.artPack);
				entry.put("name", t.name);
				texturesResult.add(entry);
			}
			ui.put("textures", texturesResult);

			List<NamedResource> borderTypes = Assets.listAllBorderTypes(null);
			List<Map<String,String>> borderResult = new java.util.ArrayList<>();
			for (NamedResource b : borderTypes) {
				Map<String,String> entry = new LinkedHashMap<>();
				entry.put("artPack", b.artPack);
				entry.put("name", b.name);
				borderResult.add(entry);
			}
			ui.put("borderTypes", borderResult);

			// City icon groups per art pack (may be empty for some packs)
			Map<String, List<String>> cityIconTypesByPack = new LinkedHashMap<>();
			PlatformFactory.setInstance(new AwtFactory());
			for (String pack : artPacks) {
				cityIconTypesByPack.put(pack, getCityIconTypesForPack(pack));
			}
			ui.put("cityIconTypesByPack", cityIconTypesByPack);
		} catch (Exception e) {
			// If resource enumeration fails, still return UI options.
			Logger.println("Failed to enumerate UI resources: " + e.getMessage());
		}

		return gson.toJson(ui);
	}
	finally
	{
		restorePreviousLanguage(previousLanguage);
	}
}

	// Recursively sort Map keys (lexicographically) so JSON serialization
	// produces deterministic canonical ordering. Lists are preserved and
	// non-container values are returned as-is.
	private static Object sortKeysInObject(Object o) {
		if (o == null) return null;
		if (o instanceof Map) return sortMap((Map<?,?>) o);
		if (o instanceof List) return sortList((List<?>) o);
		return o;
	}

	private static Map<String,Object> sortMap(Map<?,?> m) {
		java.util.TreeMap<String,Object> out = new java.util.TreeMap<>();
		for (Map.Entry<?,?> e : m.entrySet()) {
			String k = String.valueOf(e.getKey());
			out.put(k, sortKeysInObject(e.getValue()));
		}
		return out;
	}

	private static List<Object> sortList(List<?> l) {
		List<Object> out = new java.util.ArrayList<>(l.size());
		for (Object v : l) out.add(sortKeysInObject(v));
		return out;
	}

	// Recursively find any Map entries with key "books" whose value is a List
	// and sort that list lexicographically (by string value). This enforces a
	// deterministic ordering for the books array in returned .nort content.
	private static void sortBooksInObject(Object o) {
		if (o == null) return;
		if (o instanceof Map) {
			Map<?,?> m = (Map<?,?>) o;
			for (Map.Entry<?,?> e : m.entrySet()) {
				String k = String.valueOf(e.getKey());
				Object v = e.getValue();
				if ("books".equals(k) && v instanceof List) {
					try {
						@SuppressWarnings("unchecked")
						List<Object> lst = new java.util.ArrayList<>((List<Object>) v);
						lst.sort((a,b) -> String.valueOf(a).compareTo(String.valueOf(b)));
						// Replace in-place using a parameterized Map to avoid raw type put()
						@SuppressWarnings("unchecked")
						Map<String,Object> mm = (Map<String,Object>) m;
						mm.put(k, lst);
					} catch (Exception ignore) {}
				} else {
					sortBooksInObject(v);
				}
			}
		} else if (o instanceof List) {
			for (Object v : (List<?>) o) sortBooksInObject(v);
		}
	}

		// Ensure numeric values that are whole numbers are represented as
		// integer types to avoid exponential/scientific notation when
		// serialized to JSON. This walks Maps and Lists recursively.
		private static Object normalizeNumbersInObject(Object o) {
			if (o == null) return null;
			if (o instanceof Map) return normalizeMap((Map<?,?>) o);
			if (o instanceof List) return normalizeList((List<?>) o);
			if (o instanceof Number) return normalizeNumber((Number) o);
			return o;
		}

		private static Map<Object,Object> normalizeMap(Map<?,?> m) {
			Map<Object,Object> out = new LinkedHashMap<>();
			for (Map.Entry<?,?> e : m.entrySet()) {
				Object k = e.getKey();
				Object v = e.getValue();
				out.put(k, normalizeNumbersInObject(v));
			}
			return out;
		}

		private static List<Object> normalizeList(List<?> l) {
			List<Object> out = new java.util.ArrayList<>(l.size());	
			for (Object v : l) out.add(normalizeNumbersInObject(v));
			return out;
		}

		private static Object normalizeNumber(Number n) {
			if (n instanceof java.math.BigDecimal) {
				java.math.BigDecimal bd = (java.math.BigDecimal) n;
				try {
					long lv = bd.longValueExact();
					if (lv >= Integer.MIN_VALUE && lv <= Integer.MAX_VALUE) return Integer.valueOf((int) lv);
					return Long.valueOf(lv);
				} catch (ArithmeticException ae) {
					return bd.doubleValue();
				}
			}
			if (n instanceof Double || n instanceof Float) {
				double d = n.doubleValue();
				if (Double.isFinite(d) && Math.floor(d) == d) {
					long lv = (long) d;
					if (lv >= Integer.MIN_VALUE && lv <= Integer.MAX_VALUE) return Integer.valueOf((int) lv);
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

	private static Object handleBackgroundBase(Request req, Response res)
	{
		Config cfg = parseConfig(req, res);
		if (cfg == null)
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}

		PlatformFactory.setInstance(new AwtFactory());

		GenerationContext ctx = loadSettings(cfg, res);
		if (ctx == null)
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_LOAD_SETTINGS, null, null));
		}

		Image baseImage = null;
		try
		{
			baseImage = generateBackgroundBaseImage(ctx.settings, cfg);
			BufferedImage buffered = nortantis.platform.awt.AwtFactory.unwrap(baseImage);
			res.type(CONTENT_TYPE_PNG);
			res.status(200);
			writeCompressedPng(buffered, res.raw().getOutputStream());
			res.raw().getOutputStream().flush();
			return res.raw();
		}
		catch (Exception e)
		{
			Logger.println("handleBackgroundBase failed: " + e);
			res.type(CONTENT_TYPE_JSON);
			res.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to generate background base: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null));
		}
		finally
		{
			if (baseImage != null)
			{
				baseImage.close();
			}
			if (ctx.tempNortPath != null)
			{
				try
				{
					Files.deleteIfExists(ctx.tempNortPath);
				}
				catch (Exception ignore)
				{
					// Ignore cleanup errors
				}
			}
		}
	}

	private static Image generateBackgroundBaseImage(MapSettings settings, Config cfg)
	{
		int width = cfg.previewWidth != null && cfg.previewWidth > 0 ? cfg.previewWidth : DEFAULT_BACKGROUND_PREVIEW_WIDTH;
		int height = cfg.previewHeight != null && cfg.previewHeight > 0 ? cfg.previewHeight : DEFAULT_BACKGROUND_PREVIEW_HEIGHT;

		Image backgroundBase;

		if (settings.generateBackground)
		{
			Image fractal = FractalBGGenerator.generate(new Random(settings.backgroundRandomSeed), 1.3f, width, height, 0.75f);
			try
			{
				backgroundBase = fractal.deepCopy();
			}
			finally
			{
				fractal.close();
			}
		}
		else if (settings.generateBackgroundFromTexture)
		{
			Tuple2<Path, String> tuple = settings.getBackgroundImagePath();
			Path texturePath = tuple.getFirst();

			Image texture = ImageCache.getInstance(settings.backgroundTextureResource.artPack, settings.customImagesPath).getImageFromFile(texturePath);
			try
			{
				Image textureForOcean = ImageHelper.getInstance().convertToGrayscale(texture);
				Image oceanBase = BackgroundGenerator.generateUsingWhiteNoiseConvolution(new Random(settings.backgroundRandomSeed), textureForOcean, height, width);
				try
				{
					backgroundBase = oceanBase.deepCopy();
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
		else
		{
			Image solid = Image.create(width, height, ImageType.Grayscale8Bit);
			try
			{
				backgroundBase = ImageHelper.getInstance().colorize(solid, nortantis.platform.Color.create(255,255,255), ImageHelper.ColorizeAlgorithm.solidColor);
			}
			finally
			{
				solid.close();
			}
		}

		return backgroundBase;
	}

	private static void logHeaders(Request req)
	{
		if (!API_DEBUG) return;
		try
		{
			String ct = req.contentType();
			Logger.println("handleGenerate: contentType='" + ct + "' raw='" + req.raw().getContentType() + "'");
			for (String h : req.headers())
			{
				Logger.println("handleGenerate header: " + h + " = " + req.headers(h));
			}
		}
		catch (Exception e)
		{
			if (API_DEBUG) Logger.println("handleGenerate: failed to log headers: " + e.getMessage());
		}
	}

	private static Config parseConfig(Request req, Response res)
	{
		try
		{
			String contentType = req.contentType();
			if (contentType != null && contentType.toLowerCase().startsWith("multipart/form-data"))
			{
				return parseMultipartConfig(req);
			}
			else
			{
				return gson.fromJson(req.body(), Config.class);
			}
		}
		catch (Exception e)
		{
			res.status(400);
			return null;
		}
	}

	/**
	 * Parse a request body (JSON or multipart form) into RandomMapParameters.
	 * Returns null and sets response status 400 on parse errors.
	 */
	private static RandomMapParameters parseRandomMapParameters(Request req, Response res)
	{
		try
		{
			String contentType = req.contentType();
			if (contentType != null && contentType.toLowerCase().startsWith("multipart/form-data"))
			{
				try
				{
					Config cfg = parseMultipartConfig(req);
					return RandomMapParameters.fromConfig(cfg);
				}
				catch (Exception e)
				{
					res.status(400);
					return null;
				}
			}
			else
			{
				return gson.fromJson(req.body(), RandomMapParameters.class);
			}
		}
		catch (Exception e)
		{
			res.status(400);
			return null;
		}
	}

	private static Config parseMultipartConfig(Request req) throws IOException, javax.servlet.ServletException
	{
		MultipartConfigElement multipartConfigElement = new MultipartConfigElement(System.getProperty("java.io.tmpdir"));
		req.raw().setAttribute("org.eclipse.jetty.multipartConfig", multipartConfigElement);
		Part part = req.raw().getPart("nortFile");
		Config cfg = new Config();

		if (part != null)
		{
			Path temp = Files.createTempFile("nortantis-upload-", NORT_EXTENSION);
			try (InputStream is = part.getInputStream())
			{
				Files.copy(is, temp, StandardCopyOption.REPLACE_EXISTING);
			}
            // Keep the uploaded file path. Do NOT parse the uploaded JSON here;
            // preserve the original file contents so downstream JSON parsing
            // (which expects integer types) isn't affected by intermediate
            // re-serialization that can turn integers into doubles.
            cfg.nortFile = temp.toAbsolutePath().toString();
		}

		// Extract basic control fields (generatedWidth/generatedHeight/seed/saveNort/return flags).
		// Theme-specific form fields are intentionally NOT extracted for
		// multipart uploads: customization must be embedded into the uploaded
		// .nort JSON. This preserves backward compatibility for clients that
		// still send individual fields but prefers the JSON content.
		extractFormFields(req, cfg);
		return cfg;
	}

	private static void extractFormFields(Request req, Config cfg)
	{
		String genWidthStr = param(req, "generatedWidth");
		String genHeightStr = param(req, "generatedHeight");
		String seedStr = param(req, "randomSeed");

		if (genWidthStr != null)
			cfg.generatedWidth = Integer.valueOf(genWidthStr);
		if (genHeightStr != null)
			cfg.generatedHeight = Integer.valueOf(genHeightStr);
		if (seedStr != null)
			cfg.randomSeed = Long.valueOf(seedStr);
		cfg.uiLanguage = param(req, "uiLanguage");
		cfg.mapLanguage = param(req, "mapLanguage");
		// Accept the newer `language` form parameter as a fallback for clients
		// that send it instead of the legacy mapLanguage parameter.
		if (cfg.mapLanguage == null) {
			cfg.mapLanguage = param(req, "language");
		}
		// `saveNort` is always true (server persists .nort); do not accept as client parameter.
		cfg.saveNort = Boolean.TRUE;
	}

	private static String param(Request req, String name)
	{
		String v = req.raw().getParameter(name);
		return (v != null && !v.isEmpty()) ? v : null;
	}

	private static GenerationContext loadSettings(Config cfg, Response res)
	{
		boolean providedSettings = cfg.settings != null && !cfg.settings.isEmpty();
		Path tempNortPath = null;

		try
		{
			MapSettings settings;
			if (providedSettings)
			{
				tempNortPath = Files.createTempFile("nortantis-", NORT_EXTENSION);
				String settingsJson = gson.toJson(cfg.settings);
				Files.write(tempNortPath, settingsJson.getBytes(StandardCharsets.UTF_8), StandardOpenOption.TRUNCATE_EXISTING);
				settings = new MapSettings(tempNortPath.toAbsolutePath().toString());
			}
			else if (cfg.nortFile != null && !cfg.nortFile.isEmpty())
			{
				settings = new MapSettings(cfg.nortFile);
			}
			else
			{
				settings = generateRandomMapSettings(cfg);
			}

			applyCommonSettings(cfg, settings);
			// Safety: if the provided settings JSON contains icon edits (freeIcons or centerEdits),
			// ensure the hasIconEdits flag is set so MapCreator does not generate icons again.
			try {
				if (settings.edits != null) {
					// Only mark hasIconEdits true when centerEdits are present (initialized).
					// If only freeIcons are present without initialized centerEdits, the
					// editor state is incomplete and IconDrawer expects centerEdits to exist
					// for full-map icon updates. The frontend should send initialized
					// centerEdits when it intends to re-use edits; do not infer from
					// freeIcons alone to avoid NPEs in the generation pipeline.
					boolean hasCenterEdits = settings.edits.centerEdits != null && !settings.edits.centerEdits.isEmpty();
					if (hasCenterEdits) {
						settings.edits.hasIconEdits = true;
					}
				}
			} catch (Exception ignore) {
				// best-effort; if this fails, default behavior remains unchanged
			}
			applyThemeOverrides(cfg, settings);

			return new GenerationContext(settings, tempNortPath, providedSettings);
		}
		catch (IOException ex)
		{
			res.status(400);
			return null;
		}
	}

	private static MapSettings generateRandomMapSettings(Config cfg)
	{
		RandomMapParameters params = RandomMapParameters.fromConfig(cfg);
		return generateRandomMapSettings(params);
	}

	private static MapSettings generateRandomMapSettings(RandomMapParameters params)
	{
		Random rand = params.randomSeed != null ? new Random(params.randomSeed) : new Random();
		String artPack = (params.artPack != null && !params.artPack.isEmpty()) ? params.artPack : Assets.installedArtPack;
		MapSettings settings = SettingsGenerator.generate(rand, artPack, null);
		applyRandomMapParameterOverrides(params, settings);
		return settings;
	}

	private static void applyRandomMapParameterOverrides(RandomMapParameters p, MapSettings settings)
	{
		if (p.worldSize != null) settings.worldSize = p.worldSize;
		if (p.landShape != null && !p.landShape.isEmpty()) {
			try { settings.landShape = LandShape.valueOf(p.landShape); } catch (IllegalArgumentException ignored) {}
		}
		if (p.regionCount != null) settings.regionCount = p.regionCount;
		if (p.cityFrequency != null) settings.cityProbability = p.cityFrequency / 100.0 * SettingsGenerator.maxCityProbability;
		if (p.books != null && !p.books.isEmpty()) settings.books = new HashSet<>(p.books);
		if (p.dimension != null && !p.dimension.isEmpty()) {
			try {
				GeneratedDimension dim = GeneratedDimension.valueOf(p.dimension);
				if (dim != GeneratedDimension.Custom) {
					settings.generatedWidth = dim.width;
					settings.generatedHeight = dim.height;
				}
			} catch (IllegalArgumentException ignored) {}
		}
			if (p.drawRegionColors != null) settings.drawRegionColors = p.drawRegionColors;
	}

	private static class RandomMapParameters {
		String uiLanguage;
		String mapLanguage;
		Long randomSeed;
		String dimension;
		Integer worldSize;
		String landShape;
		Integer regionCount;
		Boolean drawRegionColors;
		Integer cityFrequency;
		List<String> books;
		String artPack;

		static RandomMapParameters fromConfig(Config c) {
			RandomMapParameters p = new RandomMapParameters();
			p.uiLanguage = c.uiLanguage;
			p.mapLanguage = c.mapLanguage;
			p.randomSeed = c.randomSeed;
			p.dimension = c.dimension;
			p.worldSize = c.worldSize;
			p.landShape = c.landShape;
			p.regionCount = c.regionCount;
			p.drawRegionColors = c.drawRegionColors;
			p.cityFrequency = c.cityFrequency;
			p.books = c.books;
			p.artPack = c.artPack;
			return p;
		}
	}

	private static void applyCommonSettings(Config cfg, MapSettings settings)
	{
		// Apply user-provided seed if present, overriding auto-generated value from SettingsGenerator
			if (cfg.randomSeed != null)
		{
				settings.randomSeed = cfg.randomSeed;
				// Also set background-related seeds to match for deterministic background rendering
				settings.backgroundRandomSeed = cfg.randomSeed;
				settings.regionsRandomSeed = cfg.randomSeed;
				settings.textRandomSeed = cfg.randomSeed;
				settings.frayedBorderSeed = cfg.randomSeed;
		}
	}

	private static GenerationResult generateMap(MapSettings settings, Config cfg)
	{
		// Only pass explicit render dimensions to the map creator when the
		// caller provided `generatedWidth` or `generatedHeight`. The desktop
		// generator (CLI/UI) passes `null` when no explicit output size is
		// requested which influences resolution calculations; matching that
		// behavior here ensures generated worlds are consistent given the
		// same settings and seed.
		Dimension dims = (cfg.generatedWidth != null || cfg.generatedHeight != null) ? computeRenderDimensions(settings, cfg) : null;

		try
		{
			return attemptPrimaryRender(settings, dims);
		}
		catch (Exception firstError)
		{
			Logger.println("generateMap primary render failed: " + firstError);
			return attemptFallbackRender(settings, dims, firstError);
		}
	}

	private static Dimension computeRenderDimensions(MapSettings settings, Config cfg)
	{
		// If the caller did not provide explicit width/height, prefer the
		// `generatedWidth`/`generatedHeight` from the loaded `.nort` settings
		// so maps loaded from files render at their intended resolution.
		int defaultWidth = settings.generatedWidth > 0 ? settings.generatedWidth : 2000;
		int defaultHeight = settings.generatedHeight > 0 ? settings.generatedHeight : 1200;
		int w = (cfg.generatedWidth != null) ? cfg.generatedWidth : defaultWidth;
		int h = (cfg.generatedHeight != null) ? cfg.generatedHeight : defaultHeight;
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
		catch (Exception fallbackError)
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

	private static Object returnJsonResponse(BufferedImage buf, MapSettings settings, Config cfg, Response res) throws IOException
	{
		buf = scaleImageIfNeeded(buf);
		byte[] bytes = serializeImageToBytes(buf);
		String nortContent = resolveBestNortContent(cfg, settings);

		// Parse canonical settings into a map, attach imageBase64, and return
		@SuppressWarnings("unchecked")
		Map<String, Object> settingsMap = gson.fromJson(nortContent, Map.class);
		if (settingsMap == null) settingsMap = new LinkedHashMap<>();
		settingsMap.put("imageBase64", Base64.getEncoder().encodeToString(bytes));

		res.type(CONTENT_TYPE_JSON);
		res.status(200);
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

	private static String resolveBestNortContent(Config cfg, MapSettings settings)
	{
		// Ensure edits arrays are populated so clients receive usable editor
		// state in the returned .nort. If edits are not initialized, create a
		// temporary graph and initialize center/edge/region edits from it.
		try {
			if (settings.edits == null || !settings.edits.isInitialized()) {
				try {
					nortantis.WorldGraph graph = MapCreator.createGraphForUnitTests(settings);
					try {
						if (settings.edits == null) settings.edits = new nortantis.swing.MapEdits();
						settings.edits.initializeCenterEdits(graph.centers);
						settings.edits.initializeEdgeEdits(graph.edges);
						settings.edits.initializeRegionEdits(graph.regions.values());
					} finally {
						// no explicit close needed for WorldGraph
					}
				} catch (Exception e) {
					// If graph creation fails, fall back to serializing settings as-is
					Logger.println("Failed to initialize edits for export: " + e);
				}
			}
		} catch (Throwable t) {
			// Best-effort only; avoid failing the whole request for this step.
			Logger.println("Unexpected error while preparing nort content: " + t);
		}

		// Return the canonical JSON serialization of settings.
		return settings.toJsonString();
	}

	private static void cleanupTempNortPath(Path tempNortPath, Config cfg)
	{
		if (tempNortPath != null && !cfg.saveNort)
		{
			try
			{
				Files.deleteIfExists(tempNortPath);
			}
			catch (Exception ignore)
			{
				// Ignore cleanup errors; temporary file will be cleaned up by system
			}
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

	private static class Config
	{
		String nortFile;
		Map<String, Object> settings;
		Integer generatedWidth;
		Integer generatedHeight;
		Long randomSeed;
		String uiLanguage;
		String mapLanguage;
		Boolean saveNort;
		// Always default to true; server persists .nort files by design.
		{
			saveNort = Boolean.TRUE;
		}
		// Random map generation parameters
		String artPack;
		Integer worldSize;
		String landShape;
		Integer regionCount;
		Integer cityFrequency;
		List<String> books;
		String dimension;
		Boolean drawRegionColors;
		// Final map / theme override parameters
		String backgroundType;
		String textureRef;
		Long backgroundSeed;
		Boolean drawRegionBoundaries;
		Boolean colorizeLand;
		Boolean colorizeOcean;
		String oceanColorHex;
		String landColorHex;
		String regionBoundaryStyle;
		String regionBoundaryColorHex;
		Boolean drawBorder;
		Boolean drawGridOverlay;
		// Grid overlay parameters
		String gridOverlayShape;
		Integer gridOverlayRowOrColCount;
		String gridOverlayColorHex;
		String gridOverlayXOffset;
		String gridOverlayYOffset;
		Integer gridOverlayLineWidth;
		String gridOverlayLayer;
		Boolean drawVoronoiGridOverlayOnlyOnLand;
		Boolean frayedBorder;
		Integer frayedBorderBlurLevel;
		Integer frayedBorderSize;
		Long frayedBorderSeed;
		String frayedBorderColorHex;
		Boolean drawGrunge;
		Integer grungeWidth;
		String lineStyle;
		Double coastlineWidth;
		String coastlineColorHex;
		Integer coastShadingLevel;
		String coastShadingColorHex;
		Integer coastShadingAlpha;
		Integer oceanShadingLevel;
		String oceanShadingColorHex;
		String oceanWavesType;
		Integer oceanWavesLevel;
		String oceanWavesColorHex;
		Boolean drawOceanEffectsInLakes;
		Integer concentricWaveCount;
		Boolean fadeConcentricWaves;
		Boolean jitterToConcentricWaves;
		Boolean brokenLinesForConcentricWaves;
		String riverColorHex;
		Boolean drawRoads;
		String roadStyle;
		Double roadWidth;
		String roadColorHex;
		Double mountainSize;
		Double hillSize;
		Double duneSize;
		Double treeHeight;
		Double citySize;
		Boolean drawText;
		String textColorHex;
		Boolean drawBoldBackground;
		String boldBackgroundColorHex;
		Integer previewWidth;
		Integer previewHeight;
		String titleFontFamily;
		String regionFontFamily;
		String mountainRangeFontFamily;
		String otherMountainsFontFamily;
		String citiesFontFamily;
		String riverFontFamily;
	}

	private static class GenerationContext
	{
		MapSettings settings;
		Path tempNortPath;

		GenerationContext(MapSettings settings, Path tempNortPath, boolean providedNortContent)
		{
			this.settings = settings;
			this.tempNortPath = tempNortPath;
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

	private static void applyThemeOverrides(Config cfg, MapSettings settings)
	{
		applyBackgroundType(cfg, settings);
		applyTextureRef(cfg, settings);
		applyBackgroundSeed(cfg, settings);
		applyBoundarySettings(cfg, settings);
		applyColorizationSettings(cfg, settings);
		applyColorSettings(cfg, settings);
		applyRegionBoundarySettings(cfg, settings);
		applyBorderSettings(cfg, settings);
		applyGridOverlaySettings(cfg, settings);
		applyLandColoringMethod(cfg, settings);
		applyFontFamilies(cfg, settings);
		applyEffectsAndVisualOverrides(cfg, settings);
		applyRoadAndScaleOverrides(cfg, settings);
	}

	private static void applyBackgroundType(Config cfg, MapSettings settings)
	{
		if (cfg.backgroundType != null && !cfg.backgroundType.isEmpty())
		{
			settings.generateBackgroundFromTexture = "GeneratedFromTexture".equals(cfg.backgroundType);
			settings.solidColorBackground = "SolidColor".equals(cfg.backgroundType);
		}
	}

	private static void applyTextureRef(Config cfg, MapSettings settings)
	{
		if (cfg.textureRef != null && !cfg.textureRef.isEmpty())
		{
			String[] parts = cfg.textureRef.split("\\|", 2);
			if (parts.length == 2)
			{
				settings.backgroundTextureResource = new NamedResource(parts[0], parts[1]);
				settings.backgroundTextureSource = TextureSource.Assets;
			}
		}
	}

	private static void applyBackgroundSeed(Config cfg, MapSettings settings)
	{
		if (cfg.backgroundSeed != null)
		{
			settings.backgroundRandomSeed = cfg.backgroundSeed;
		}
	}

	private static void applyBoundarySettings(Config cfg, MapSettings settings)
	{
		if (cfg.drawRegionBoundaries != null)
		{
			settings.drawRegionBoundaries = cfg.drawRegionBoundaries;
		}
	}

	private static void applyColorizationSettings(Config cfg, MapSettings settings)
	{
		if (cfg.colorizeLand != null)
		{
			settings.colorizeLand = cfg.colorizeLand;
		}
		if (cfg.colorizeOcean != null)
		{
			settings.colorizeOcean = cfg.colorizeOcean;
		}
	}

	private static void applyColorSettings(Config cfg, MapSettings settings)
	{
		if (cfg.oceanColorHex != null && !cfg.oceanColorHex.isEmpty())
		{
			settings.oceanColor = hexToColor(cfg.oceanColorHex);
		}
		if (cfg.landColorHex != null && !cfg.landColorHex.isEmpty())
		{
			settings.landColor = hexToColor(cfg.landColorHex);
		}
		if (cfg.regionBoundaryColorHex != null && !cfg.regionBoundaryColorHex.isEmpty())
		{
			settings.regionBoundaryColor = hexToColor(cfg.regionBoundaryColorHex);
		}
	}

	private static void applyRegionBoundarySettings(Config cfg, MapSettings settings)
	{
		if (cfg.regionBoundaryStyle != null && !cfg.regionBoundaryStyle.isEmpty())
		{
			try
			{
				StrokeType strokeType = StrokeType.valueOf(cfg.regionBoundaryStyle);
				// Width must be supplied via the settings JSON (regionBoundaryStyle.width).
				float width = settings.regionBoundaryStyle.width;
				settings.regionBoundaryStyle = new Stroke(strokeType, width);
			}
			catch (IllegalArgumentException ignored)
			{
				// If the stroke type is invalid, keep the existing region boundary style
			}
		}
	}

	private static void applyBorderSettings(Config cfg, MapSettings settings)
	{
		if (cfg.drawBorder != null)
		{
			settings.drawBorder = cfg.drawBorder;
		}
		if (cfg.drawGridOverlay != null)
		{
			settings.drawGridOverlay = cfg.drawGridOverlay;
		}
	}

	private static void applyGridOverlaySettings(Config cfg, MapSettings settings)
	{
		if (cfg.gridOverlayShape != null && !cfg.gridOverlayShape.isEmpty())
		{
			try
			{
				settings.gridOverlayShape = Enum.valueOf(GridOverlayShape.class, cfg.gridOverlayShape);
			}
			catch (IllegalArgumentException ignored) {}
		}
		if (cfg.gridOverlayRowOrColCount != null)
		{
			settings.gridOverlayRowOrColCount = cfg.gridOverlayRowOrColCount;
		}
		if (cfg.gridOverlayColorHex != null && !cfg.gridOverlayColorHex.isEmpty())
		{
			settings.gridOverlayColor = hexToColor(cfg.gridOverlayColorHex);
		}
		if (cfg.gridOverlayXOffset != null && !cfg.gridOverlayXOffset.isEmpty())
		{
			try { settings.gridOverlayXOffset = GridOverlayOffset.parse(cfg.gridOverlayXOffset); } catch (Exception ignored) {}
		}
		if (cfg.gridOverlayYOffset != null && !cfg.gridOverlayYOffset.isEmpty())
		{
			try { settings.gridOverlayYOffset = GridOverlayOffset.parse(cfg.gridOverlayYOffset); } catch (Exception ignored) {}
		}
		if (cfg.gridOverlayLineWidth != null)
		{
			settings.gridOverlayLineWidth = cfg.gridOverlayLineWidth;
		}
		if (cfg.gridOverlayLayer != null && !cfg.gridOverlayLayer.isEmpty())
		{
			try
			{
				settings.gridOverlayLayer = Enum.valueOf(MapSettings.GridOverlayLayer.class, cfg.gridOverlayLayer);
			}
			catch (IllegalArgumentException ignored) {}
		}
		if (cfg.drawVoronoiGridOverlayOnlyOnLand != null)
		{
			settings.drawVoronoiGridOverlayOnlyOnLand = cfg.drawVoronoiGridOverlayOnlyOnLand;
		}
	}

	private static void applyLandColoringMethod(Config cfg, MapSettings settings)
	{
		if (cfg.drawRegionColors != null)
		{
			settings.drawRegionColors = cfg.drawRegionColors;
		}
	}

	private static void applyFontFamilies(Config cfg, MapSettings settings)
	{
		applyFontFamily(cfg.titleFontFamily, settings.titleFont, font -> settings.titleFont = font);
		applyFontFamily(cfg.regionFontFamily, settings.regionFont, font -> settings.regionFont = font);
		applyFontFamily(cfg.mountainRangeFontFamily, settings.mountainRangeFont, font -> settings.mountainRangeFont = font);
		applyFontFamily(cfg.otherMountainsFontFamily, settings.otherMountainsFont, font -> settings.otherMountainsFont = font);
		applyFontFamily(cfg.citiesFontFamily, settings.citiesFont, font -> settings.citiesFont = font);
		applyFontFamily(cfg.riverFontFamily, settings.riverFont, font -> settings.riverFont = font);
	}

	private static void applyEffectsAndVisualOverrides(Config cfg, MapSettings settings)
	{
		if (cfg.frayedBorder != null)
		{
			settings.frayedBorder = cfg.frayedBorder;
		}
		if (cfg.frayedBorderBlurLevel != null)
		{
			settings.frayedBorderBlurLevel = cfg.frayedBorderBlurLevel;
		}
		if (cfg.frayedBorderSize != null)
		{
			settings.frayedBorderSize = cfg.frayedBorderSize;
		}
		if (cfg.frayedBorderSeed != null)
		{
			settings.frayedBorderSeed = cfg.frayedBorderSeed;
		}
		if (cfg.frayedBorderColorHex != null && !cfg.frayedBorderColorHex.isEmpty())
		{
			settings.frayedBorderColor = hexToColor(cfg.frayedBorderColorHex);
		}

		if (cfg.drawGrunge != null)
		{
			settings.drawGrunge = cfg.drawGrunge;
		}
		if (cfg.grungeWidth != null)
		{
			settings.grungeWidth = cfg.grungeWidth;
		}

		if (cfg.lineStyle != null && !cfg.lineStyle.isEmpty())
		{
            try
            {
                settings.lineStyle = MapSettings.LineStyle.valueOf(cfg.lineStyle);
            }
			catch (IllegalArgumentException ignored) {}
		}

		if (cfg.coastlineWidth != null)
		{
			settings.coastlineWidth = cfg.coastlineWidth;
		}
		if (cfg.coastlineColorHex != null && !cfg.coastlineColorHex.isEmpty())
		{
			settings.coastlineColor = hexToColor(cfg.coastlineColorHex);
		}

		if (cfg.coastShadingLevel != null)
		{
			settings.coastShadingLevel = cfg.coastShadingLevel;
		}
		if (cfg.coastShadingColorHex != null && !cfg.coastShadingColorHex.isEmpty())
		{
			if (cfg.coastShadingAlpha != null)
			{
				String h = cfg.coastShadingColorHex.startsWith("#") ? cfg.coastShadingColorHex.substring(1) : cfg.coastShadingColorHex;
				int r = Integer.parseInt(h.substring(0, 2), 16);
				int g = Integer.parseInt(h.substring(2, 4), 16);
				int b = Integer.parseInt(h.substring(4, 6), 16);
				int alpha = (int) ((1.0 - cfg.coastShadingAlpha / 100.0) * 255);
				settings.coastShadingColor = Color.create(r, g, b, alpha);
			}
			else
			{
				settings.coastShadingColor = hexToColor(cfg.coastShadingColorHex);
			}
		}

		if (cfg.oceanShadingLevel != null)
		{
			settings.oceanShadingLevel = cfg.oceanShadingLevel;
		}
		if (cfg.oceanShadingColorHex != null && !cfg.oceanShadingColorHex.isEmpty())
		{
			// The UI now encodes transparency into the color token itself.
			settings.oceanShadingColor = hexToColor(cfg.oceanShadingColorHex);
		}

		if (cfg.oceanWavesType != null && !cfg.oceanWavesType.isEmpty())
		{
            try
            {
                settings.oceanWavesType = MapSettings.OceanWaves.valueOf(cfg.oceanWavesType);
            }
			catch (IllegalArgumentException ignored) {}
		}
		if (cfg.oceanWavesLevel != null)
		{
			settings.oceanWavesLevel = cfg.oceanWavesLevel;
		}
		if (cfg.oceanWavesColorHex != null && !cfg.oceanWavesColorHex.isEmpty())
		{
			settings.oceanWavesColor = hexToColor(cfg.oceanWavesColorHex);
		}

		if (cfg.drawOceanEffectsInLakes != null)
		{
			settings.drawOceanEffectsInLakes = cfg.drawOceanEffectsInLakes;
		}

		if (cfg.concentricWaveCount != null)
		{
			settings.concentricWaveCount = cfg.concentricWaveCount;
		}
		if (cfg.fadeConcentricWaves != null)
		{
			settings.fadeConcentricWaves = cfg.fadeConcentricWaves;
		}
		if (cfg.jitterToConcentricWaves != null)
		{
			settings.jitterToConcentricWaves = cfg.jitterToConcentricWaves;
		}
		if (cfg.brokenLinesForConcentricWaves != null)
		{
			settings.brokenLinesForConcentricWaves = cfg.brokenLinesForConcentricWaves;
		}

		if (cfg.riverColorHex != null && !cfg.riverColorHex.isEmpty())
		{
			settings.riverColor = hexToColor(cfg.riverColorHex);
		}
	}

	private static void applyRoadAndScaleOverrides(Config cfg, MapSettings settings)
	{
		if (cfg.drawRoads != null)
		{
			settings.drawRoads = cfg.drawRoads;
		}
		if (cfg.roadStyle != null && !cfg.roadStyle.isEmpty())
		{
			try
			{
				StrokeType strokeType = StrokeType.valueOf(cfg.roadStyle);
				float width = cfg.roadWidth != null ? cfg.roadWidth.floatValue() : (settings.roadStyle != null ? settings.roadStyle.width : 1.0f);
				settings.roadStyle = new Stroke(strokeType, width);
			}
			catch (IllegalArgumentException ignored) {}
		}
		if (cfg.roadColorHex != null && !cfg.roadColorHex.isEmpty())
		{
			settings.roadColor = hexToColor(cfg.roadColorHex);
		}

		if (cfg.mountainSize != null)
		{
			settings.mountainScale = cfg.mountainSize;
		}
		if (cfg.hillSize != null)
		{
			settings.hillScale = cfg.hillSize;
		}
		if (cfg.duneSize != null)
		{
			settings.duneScale = cfg.duneSize;
		}
		if (cfg.treeHeight != null)
		{
			settings.treeHeightScale = cfg.treeHeight;
		}
		if (cfg.citySize != null)
		{
			settings.cityScale = cfg.citySize;
		}

		if (cfg.drawText != null)
		{
			settings.drawText = cfg.drawText;
		}
		if (cfg.textColorHex != null && !cfg.textColorHex.isEmpty())
		{
			settings.textColor = hexToColor(cfg.textColorHex);
		}
		if (cfg.drawBoldBackground != null)
		{
			settings.drawBoldBackground = cfg.drawBoldBackground;
		}
		if (cfg.boldBackgroundColorHex != null && !cfg.boldBackgroundColorHex.isEmpty())
		{
			settings.boldBackgroundColor = hexToColor(cfg.boldBackgroundColorHex);
		}
	}

	private static void applyFontFamily(String fontFamily, Font currentFont, java.util.function.Consumer<Font> setter)
	{
		if (fontFamily != null && !fontFamily.isEmpty() && currentFont != null)
		{
			setter.accept(Font.create(fontFamily, currentFont.getStyle(), currentFont.getSize()));
		}
	}

	private static Color hexToColor(String hex)
	{
		String h = hex.startsWith("#") ? hex.substring(1) : hex;
		int r = Integer.parseInt(h.substring(0, 2), 16);
		int g = Integer.parseInt(h.substring(2, 4), 16);
		int b = Integer.parseInt(h.substring(4, 6), 16);
		return Color.create(r, g, b);
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

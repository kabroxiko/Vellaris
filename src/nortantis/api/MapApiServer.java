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
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.util.zip.GZIPOutputStream;
import java.time.Instant;
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
import java.nio.file.Paths;
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

		get("/api/health", (req, res) -> "ok");

		get("/api/art-packs", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(Assets.listArtPacks(false));
		});

		get("/api/books", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(SettingsGenerator.getAllBooks());
		});
		get("/api/textures", (req, res) ->
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
		});

		get("/api/border-types", (req, res) ->
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
		});

		get("/api/ui-options", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			String requestedLanguage = req.queryParams("language");
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
						try {
							List<String> types = ImageCache.getInstance(pack, null).getIconGroupNames(IconType.cities);
							cityIconTypesByPack.put(pack, types);
						} catch (Exception e) {
							cityIconTypesByPack.put(pack, java.util.Collections.emptyList());
						}
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
		});

		post("/api/generate", MapApiServer::handleGenerate);
		post("/api/background-preview", MapApiServer::handleBackgroundPreview);
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
		if (cfg == null)
		{
			return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_PARSE_CONFIG, null, null));
		}

		PlatformFactory.setInstance(new AwtFactory());
		String previousLanguage = UserPreferences.getInstance().language;
		applyRequestLanguage(resolveGenerationLanguage(cfg));

		try
		{
			GenerationContext ctx = loadSettings(cfg, res);
			if (ctx == null)
			{
				return gson.toJson(new ApiResponse(false, MSG_FAILED_TO_LOAD_SETTINGS, null, null));
			}

				GenerationResult generation = generateMap(ctx.settings, cfg);
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
				return returnJsonResponse(buf, ctx.settings, cfg, res);
			} catch (Exception e) {
				Logger.println("returnJsonResponse failed: " + e);
				res.status(500);
				return gson.toJson(new ApiResponse(false, "Failed to produce JSON response: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null));
			} finally {
				img.close();
				cleanupTempNortPath(ctx.tempNortPath, cfg);
			}
		}
		finally
		{
			restorePreviousLanguage(previousLanguage);
		}
	}

	private static void applyRequestLanguage(String language)
	{
		if (language == null || language.isEmpty())
		{
			return;
		}

		for (Locale locale : Translation.getSupportedLocales())
		{
			if (locale.getLanguage().equals(language))
			{
				UserPreferences.getInstance().language = language;
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

		if (cfg.mapLanguage != null && !cfg.mapLanguage.isEmpty())
		{
			return cfg.mapLanguage;
		}

		return cfg.language;
	}

	private static void restorePreviousLanguage(String previousLanguage)
	{
		UserPreferences.getInstance().language = previousLanguage;
		Translation.initialize();
	}

	private static Map<String, Object> buildWebUiOptions()
	{
		Map<String, Object> options = new LinkedHashMap<>();
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
		options.put("borderColorOptions",
				List.of(option("Ocean_color", tr("BorderColorOption.Ocean_color")), option("Choose_color", tr("BorderColorOption.Choose_color"))));
		options.put("lineStyles", List.of(option("Jagged", tr("theme.lineStyle.jagged")), option("Splines", tr("theme.lineStyle.splines")),
				option("SplinesWithSmoothedCoastlines", tr("theme.lineStyle.splinesSmoothed"))));
		options.put("oceanWaveTypes", List.of(option("ConcentricWaves", tr("theme.waveType.concentricWaves")), option("Ripples", tr("theme.waveType.ripples")),
				option("None", tr("theme.waveType.none"))));

		// Provide a curated, hard-coded list of fonts suitable for fantasy
		// map text per operating system. Do NOT rely on ad-hoc keyword
		// matching — return only the canonical families the server ships
		// as recommended choices (intersected with installed families).
		try {
			java.awt.GraphicsEnvironment ge = java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment();
			String[] families = ge.getAvailableFontFamilyNames();
			java.util.List<String> installed = java.util.Arrays.asList(families);

			java.util.List<String> hardcoded = new java.util.ArrayList<>();
			String osName = System.getProperty("os.name", "").toLowerCase();
			if (osName.contains("mac")) {
				// macOS: common system and display faces found on Macs
				java.util.Collections.addAll(hardcoded,
					"Apple Chancery", "Trajan Pro", "Optima", "Palatino", "Hoefler Text",
					"Garamond", "Times New Roman", "Georgia", "Baskerville"
				);
			} else if (osName.contains("win")) {
				// Windows: common Windows faces suitable for map typography
				java.util.Collections.addAll(hardcoded,
					"Trajan Pro", "Garamond", "Times New Roman", "Palatino Linotype",
					"Book Antiqua", "Georgia", "Century Schoolbook"
				);
			} else {
				// Linux / Other: common open-source serif and display faces
				java.util.Collections.addAll(hardcoded,
					"EB Garamond", "Libre Baskerville", "Gentium", "DejaVu Serif",
					"Cardo", "Cinzel", "Cormorant Garamond", "FreeSerif"
				);
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

			// Return only the filtered list (may be empty if none match).
			options.put("fonts", filtered);
			if (!filtered.isEmpty()) {
				options.put("defaultFontFamily", filtered.get(0));
			}
		} catch (Exception e) {
			if (API_DEBUG) Logger.println("Failed to enumerate system fonts: " + e.getMessage());
		}

		// Publish the backend's maximum per-center city probability so
		// frontends can convert internal `cityProbability` to a user
		// percentage for the `cityFrequency` slider.
		options.put("maxCityProbability", SettingsGenerator.maxCityProbability);

		options.put("gridOverlayShapes", List.of(option("Horizontal_hexes", tr("GridOverlayShape.Horizontal_hexes")), option("Vertical_hexes", tr("GridOverlayShape.Vertical_hexes")), option("Squares", tr("GridOverlayShape.Squares")), option("Voronoi_polygons", tr("GridOverlayShape.Voronoi_polygons"))));
		options.put("gridOverlayOffsets", List.of(option("zero", tr("GridOverlayOffset.zero")), option("quarter", tr("GridOverlayOffset.quarter")), option("half", tr("GridOverlayOffset.half")), option("threeQuarters", tr("GridOverlayOffset.threeQuarters"))));
		options.put("gridOverlayLayers", List.of(option("Under_icons", tr("GridOverlayLayer.Under_icons")), option("Over_icons", tr("GridOverlayLayer.Over_icons"))));

		// Return the entire translation bundle so the frontend receives the
		// complete i18n dictionary for the effective locale. The bundle is
		// intentionally small and easier to maintain than a manual key list.
		Map<String, String> labels = new LinkedHashMap<>();
		try {
			ResourceBundle bundle = ResourceBundle.getBundle("nortantis.swing.translation.messages", Translation.getEffectiveLocale());
			for (String k : bundle.keySet()) {
				String v = bundle.getString(k);
				if (v != null) {
					labels.put(k, v.trim());
				}
			}
		} catch (Exception e) {
			if (API_DEBUG) Logger.println("Failed to load translation bundle: " + e.getMessage());
		}

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("options", options);
		if (!labels.isEmpty())
		{
			result.put("labels", labels);
		}

		// Provide backend defaults so frontends can initialize controls.
		// To match desktop behavior, generate a randomized default preset
		// using the same generator used by the desktop application. This
		// starts from the bundled properties defaults and then mutates
		// values randomly (world size, colors, border, etc.).
		try {
			// Select a reasonable art pack to pass to the generator.
			List<String> artPacks = Assets.listArtPacks(false);
			String artPack = (artPacks != null && !artPacks.isEmpty()) ? artPacks.get(0) : Assets.installedArtPack;

			// Generate a fresh randomized default preset (no external seed).
			Random rand = new Random();
			MapSettings generated = SettingsGenerator.generate(rand, artPack, null);
			String defJson = generated.toJsonString();
			@SuppressWarnings("unchecked")
			Map<String, Object> defMap = gson.fromJson(defJson, Map.class);

			// Return the full generated defaults map so frontends receive the
			// complete generated `MapSettings` values (no filtering).
			// Normalize numeric types to avoid scientific notation in JSON
			@SuppressWarnings("unchecked")
			Map<String,Object> normalized = (Map<String,Object>) normalizeNumbersInObject(defMap);
			result.put("defaults", normalized);
		} catch (Exception e) {
			// If defaults cannot be produced, omit the field (best-effort)
			if (API_DEBUG) Logger.println("Failed to produce UI defaults: " + e.getMessage());
		}

		return result;
	}

		// Ensure numeric values that are whole numbers are represented as
		// integer types to avoid exponential/scientific notation when
		// serialized to JSON. This walks Maps and Lists recursively.
		private static Object normalizeNumbersInObject(Object o) {
			if (o == null) return null;
			if (o instanceof Map) {
				Map<?,?> m = (Map<?,?>) o;
				Map<Object,Object> out = new LinkedHashMap<>();
				for (Map.Entry<?,?> e : m.entrySet()) {
					Object k = e.getKey();
					Object v = e.getValue();
					out.put(k, normalizeNumbersInObject(v));
				}
				return out;
			}
			if (o instanceof List) {
				List<?> l = (List<?>) o;
				List<Object> out = new java.util.ArrayList<>(l.size());
				for (Object v : l) out.add(normalizeNumbersInObject(v));
				return out;
			}
			if (o instanceof Number) {
				Number n = (Number) o;
				// Handle BigDecimal specially if present
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
				// For integral numeric types, return as-is
				return n;
			}
			return o;
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

	private static Object handleBackgroundPreview(Request req, Response res)
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

		Image previewImage = null;
		try
		{
			previewImage = generateBackgroundPreviewImage(ctx.settings, cfg);
			BufferedImage buffered = nortantis.platform.awt.AwtFactory.unwrap(previewImage);
			res.type(CONTENT_TYPE_PNG);
			res.status(200);
			writeCompressedPng(buffered, res.raw().getOutputStream());
			res.raw().getOutputStream().flush();
			return res.raw();
		}
		catch (Exception e)
		{
			Logger.println("handleBackgroundPreview failed: " + e);
			res.type(CONTENT_TYPE_JSON);
			res.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to generate background preview: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null));
		}
		finally
		{
			if (previewImage != null)
			{
				previewImage.close();
			}
			if (ctx.tempNortPath != null)
			{
				try
				{
					Files.deleteIfExists(ctx.tempNortPath);
				}
				catch (Exception ignore)
				{
					// Ignore cleanup errors; temporary file will be cleaned up by system
				}
			}
		}
	}

	private static Image generateBackgroundPreviewImage(MapSettings settings, Config cfg)
	{
		int width = cfg.previewWidth != null && cfg.previewWidth > 0 ? cfg.previewWidth : DEFAULT_BACKGROUND_PREVIEW_WIDTH;
		int height = cfg.previewHeight != null && cfg.previewHeight > 0 ? cfg.previewHeight : DEFAULT_BACKGROUND_PREVIEW_HEIGHT;

		Image backgroundPreview;

		if (settings.generateBackground)
		{
			Image fractal = FractalBGGenerator.generate(new Random(settings.backgroundRandomSeed), 1.3f, width, height, 0.75f);
			try
			{
				backgroundPreview = ImageHelper.getInstance().colorize(fractal, settings.oceanColor, ImageHelper.ColorizeAlgorithm.algorithm2);
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
				Image textureForOcean = settings.colorizeOcean ? ImageHelper.getInstance().convertToGrayscale(texture) : texture;
				Image oceanBase = BackgroundGenerator.generateUsingWhiteNoiseConvolution(new Random(settings.backgroundRandomSeed), textureForOcean, height, width);
				try
				{
					backgroundPreview = settings.colorizeOcean ? ImageHelper.getInstance().colorize(oceanBase, settings.oceanColor, ImageHelper.ColorizeAlgorithm.algorithm3) : oceanBase.deepCopy();
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
				backgroundPreview = ImageHelper.getInstance().colorize(solid, settings.oceanColor, ImageHelper.ColorizeAlgorithm.solidColor);
			}
			finally
			{
				solid.close();
			}
		}

		return backgroundPreview;
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
		String saveNortStr = param(req, "saveNort");

		if (genWidthStr != null)
			cfg.generatedWidth = Integer.valueOf(genWidthStr);
		if (genHeightStr != null)
			cfg.generatedHeight = Integer.valueOf(genHeightStr);
		if (seedStr != null)
			cfg.randomSeed = Long.valueOf(seedStr);
		cfg.language = param(req, "language");
		cfg.mapLanguage = param(req, "mapLanguage");
		if (saveNortStr != null)
			cfg.saveNort = Boolean.valueOf(saveNortStr);
		// `returnSettings` is deprecated - server always returns settings
		// alongside the image. Parse but ignore for backward compatibility.
		String returnSettingsStr = param(req, "returnSettings");
		if (returnSettingsStr != null) {
			try { cfg.returnSettings = Boolean.valueOf(returnSettingsStr); } catch (Exception ignored) {}
		}
		// The server always returns a JSON payload containing both the
		// image (base64) and the merged .nort settings so clients can
		// retrieve edited settings alongside the generated map image.
	}

	private static String param(Request req, String name)
	{
		String v = req.raw().getParameter(name);
		return (v != null && !v.isEmpty()) ? v : null;
	}

	private static void extractThemeFormFields(Request req, Config cfg)
	{
		cfg.backgroundType = param(req, "backgroundType");
		cfg.textureRef = param(req, "textureRef");
		String bgSeed = param(req, "backgroundSeed");
		if (bgSeed != null)
			cfg.backgroundSeed = Long.valueOf(bgSeed);
		String drawReg = param(req, "drawRegionBoundaries");
		if (drawReg != null)
			cfg.drawRegionBoundaries = Boolean.valueOf(drawReg);
		String colLand = param(req, "colorizeLand");
		if (colLand != null)
			cfg.colorizeLand = Boolean.valueOf(colLand);
		String colOcean = param(req, "colorizeOcean");
		if (colOcean != null)
			cfg.colorizeOcean = Boolean.valueOf(colOcean);
		cfg.oceanColorHex = param(req, "oceanColorHex");
		cfg.landColorHex = param(req, "landColorHex");
		cfg.regionBoundaryStyle = param(req, "regionBoundaryStyle");
		cfg.regionBoundaryColorHex = param(req, "regionBoundaryColorHex");
		String dBorder = param(req, "drawBorder");
		if (dBorder != null)
			cfg.drawBorder = Boolean.valueOf(dBorder);
		String dGrid = param(req, "drawGridOverlay");
		if (dGrid != null)
			cfg.drawGridOverlay = Boolean.valueOf(dGrid);
		String gridShape = param(req, "gridOverlayShape");
		if (gridShape != null) cfg.gridOverlayShape = gridShape;
		String gridCount = param(req, "gridOverlayRowOrColCount");
		if (gridCount != null) cfg.gridOverlayRowOrColCount = Integer.valueOf(gridCount);
		String gridColor = param(req, "gridOverlayColorHex");
		if (gridColor != null) cfg.gridOverlayColorHex = gridColor;
		String gridX = param(req, "gridOverlayXOffset");
		if (gridX != null) cfg.gridOverlayXOffset = gridX;
		String gridY = param(req, "gridOverlayYOffset");
		if (gridY != null) cfg.gridOverlayYOffset = gridY;
		String gridLine = param(req, "gridOverlayLineWidth");
		if (gridLine != null) cfg.gridOverlayLineWidth = Integer.valueOf(gridLine);
		String gridLayer = param(req, "gridOverlayLayer");
		if (gridLayer != null) cfg.gridOverlayLayer = gridLayer;
		String voronoiOnly = param(req, "drawVoronoiGridOverlayOnlyOnLand");
		if (voronoiOnly != null) cfg.drawVoronoiGridOverlayOnlyOnLand = Boolean.valueOf(voronoiOnly);

		String fBorder = param(req, "frayedBorder");
		if (fBorder != null)
			cfg.frayedBorder = Boolean.valueOf(fBorder);
		String fBlur = param(req, "frayedBorderBlurLevel");
		if (fBlur != null)
			cfg.frayedBorderBlurLevel = Integer.valueOf(fBlur);
		String fSize = param(req, "frayedBorderSize");
		if (fSize != null)
			cfg.frayedBorderSize = Integer.valueOf(fSize);
		String fSeed = param(req, "frayedBorderSeed");
		if (fSeed != null)
			cfg.frayedBorderSeed = Long.valueOf(fSeed);
		cfg.frayedBorderColorHex = param(req, "frayedBorderColorHex");

		String gDraw = param(req, "drawGrunge");
		if (gDraw != null)
			cfg.drawGrunge = Boolean.valueOf(gDraw);
		String gWidth = param(req, "grungeWidth");
		if (gWidth != null)
			cfg.grungeWidth = Integer.valueOf(gWidth);

		cfg.lineStyle = param(req, "lineStyle");
		String cWidth = param(req, "coastlineWidth");
		if (cWidth != null)
			cfg.coastlineWidth = Double.valueOf(cWidth);
		cfg.coastlineColorHex = param(req, "coastlineColorHex");
		String coastShade = param(req, "coastShadingLevel");
		if (coastShade != null)
			cfg.coastShadingLevel = Integer.valueOf(coastShade);
		cfg.coastShadingColorHex = param(req, "coastShadingColorHex");
		String coastAlpha = param(req, "coastShadingAlpha");
		if (coastAlpha != null)
			cfg.coastShadingAlpha = Integer.valueOf(coastAlpha);

		String oceanShade = param(req, "oceanShadingLevel");
		if (oceanShade != null)
			cfg.oceanShadingLevel = Integer.valueOf(oceanShade);
		cfg.oceanShadingColorHex = param(req, "oceanShadingColorHex");
		cfg.oceanWavesType = param(req, "oceanWavesType");
		String oceanWaveLevel = param(req, "oceanWavesLevel");
		if (oceanWaveLevel != null)
			cfg.oceanWavesLevel = Integer.valueOf(oceanWaveLevel);
		cfg.oceanWavesColorHex = param(req, "oceanWavesColorHex");
		String drawOceanLakes = param(req, "drawOceanEffectsInLakes");
		if (drawOceanLakes != null)
			cfg.drawOceanEffectsInLakes = Boolean.valueOf(drawOceanLakes);

		String concentricCount = param(req, "concentricWaveCount");
		if (concentricCount != null)
			cfg.concentricWaveCount = Integer.valueOf(concentricCount);
		String fadeConcentric = param(req, "fadeConcentricWaves");
		if (fadeConcentric != null)
			cfg.fadeConcentricWaves = Boolean.valueOf(fadeConcentric);
		String jitterConcentric = param(req, "jitterToConcentricWaves");
		if (jitterConcentric != null)
			cfg.jitterToConcentricWaves = Boolean.valueOf(jitterConcentric);
		String brokenConcentric = param(req, "brokenLinesForConcentricWaves");
		if (brokenConcentric != null)
			cfg.brokenLinesForConcentricWaves = Boolean.valueOf(brokenConcentric);

		cfg.riverColorHex = param(req, "riverColorHex");

		String dRoads = param(req, "drawRoads");
		if (dRoads != null)
			cfg.drawRoads = Boolean.valueOf(dRoads);
		cfg.roadStyle = param(req, "roadStyle");
		String rWidth = param(req, "roadWidth");
		if (rWidth != null)
			cfg.roadWidth = Double.valueOf(rWidth);
		cfg.roadColorHex = param(req, "roadColorHex");

		String mSize = param(req, "mountainSize");
		if (mSize != null)
			cfg.mountainSize = Double.valueOf(mSize);
		String hSize = param(req, "hillSize");
		if (hSize != null)
			cfg.hillSize = Double.valueOf(hSize);
		String dSize = param(req, "duneSize");
		if (dSize != null)
			cfg.duneSize = Double.valueOf(dSize);
		String tHeight = param(req, "treeHeight");
		if (tHeight != null)
			cfg.treeHeight = Double.valueOf(tHeight);
		String cSize = param(req, "citySize");
		if (cSize != null)
			cfg.citySize = Double.valueOf(cSize);

		String dText = param(req, "drawText");
		if (dText != null)
			cfg.drawText = Boolean.valueOf(dText);
		cfg.textColorHex = param(req, "textColorHex");
		String dBold = param(req, "drawBoldBackground");
		if (dBold != null)
			cfg.drawBoldBackground = Boolean.valueOf(dBold);
		cfg.boldBackgroundColorHex = param(req, "boldBackgroundColorHex");
		String drawRegionsStr = param(req, "drawRegionColors");
		if (drawRegionsStr != null)
			cfg.drawRegionColors = Boolean.valueOf(drawRegionsStr);
		cfg.titleFontFamily = param(req, "titleFontFamily");
		cfg.regionFontFamily = param(req, "regionFontFamily");
		cfg.mountainRangeFontFamily = param(req, "mountainRangeFontFamily");
		cfg.otherMountainsFontFamily = param(req, "otherMountainsFontFamily");
		cfg.citiesFontFamily = param(req, "citiesFontFamily");
		cfg.riverFontFamily = param(req, "riverFontFamily");
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

			// Concise diagnostics: log only counts and flags (avoid printing full .nort JSON)
			try {
				int freeIconsCount = 0;
				int centerEditsCount = 0;
				boolean hasIconEdits = false;
				if (settings.edits != null) {
					if (settings.edits.freeIcons != null) freeIconsCount = settings.edits.freeIcons.calcSize();
					if (settings.edits.centerEdits != null) centerEditsCount = settings.edits.centerEdits.size();
					hasIconEdits = settings.edits.hasIconEdits;
				}
			} catch (Exception ignore) {
				// best-effort diagnostics; ignore failures
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
		Random rand = cfg.randomSeed != null ? new Random(cfg.randomSeed) : new Random();
		String artPack = (cfg.artPack != null && !cfg.artPack.isEmpty()) ? cfg.artPack : Assets.installedArtPack;
		MapSettings settings = SettingsGenerator.generate(rand, artPack, null);
		applyRandomMapConfigOverrides(cfg, settings);
		return settings;
	}

	private static void applyRandomMapConfigOverrides(Config cfg, MapSettings settings)
	{
		applyWorldSize(cfg, settings);
		applyLandShape(cfg, settings);
		applyRegionCount(cfg, settings);
		applyCityFrequency(cfg, settings);
		applyBooks(cfg, settings);
		applyDimension(cfg, settings);
	}

	private static void applyWorldSize(Config cfg, MapSettings settings)
	{
		if (cfg.worldSize != null)
		{
			settings.worldSize = cfg.worldSize;
		}
	}

	private static void applyLandShape(Config cfg, MapSettings settings)
	{
		if (cfg.landShape != null && !cfg.landShape.isEmpty())
		{
			try
			{
				settings.landShape = LandShape.valueOf(cfg.landShape);
			}
			catch (IllegalArgumentException ignored)
			{
				// Keep randomly generated land shape if the value is invalid
			}
		}
	}

	private static void applyRegionCount(Config cfg, MapSettings settings)
	{
		if (cfg.regionCount != null)
		{
			settings.regionCount = cfg.regionCount;
		}
	}

	private static void applyCityFrequency(Config cfg, MapSettings settings)
	{
		if (cfg.cityFrequency != null)
		{
			settings.cityProbability = cfg.cityFrequency / 100.0 * SettingsGenerator.maxCityProbability;
		}
	}

	private static void applyBooks(Config cfg, MapSettings settings)
	{
		if (cfg.books != null && !cfg.books.isEmpty())
		{
			settings.books = new HashSet<>(cfg.books);
		}
	}

	private static void applyDimension(Config cfg, MapSettings settings)
	{
		if (cfg.dimension != null && !cfg.dimension.isEmpty())
		{
			try
			{
				GeneratedDimension dim = GeneratedDimension.valueOf(cfg.dimension);
				if (dim != GeneratedDimension.Custom)
				{
					settings.generatedWidth = dim.width;
					settings.generatedHeight = dim.height;
				}
			}
			catch (IllegalArgumentException ignored)
			{
				// Keep randomly generated dimension if the value is invalid
			}
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

	private static String determineOutputPath(Config cfg, Response res, Image img)
	{
		String outPath = cfg.out;
		if (outPath == null || outPath.isEmpty())
		{
			try
			{
				File tmp = File.createTempFile("nortantis-map-" + Instant.now().toEpochMilli(), ".png");
				outPath = tmp.getAbsolutePath();
			}
			catch (IOException e)
			{
				img.close();
				res.status(500);
				return null;
			}
		}
		return outPath;
	}

	private static final int MAX_BASE64_PREVIEW_DIMENSION = 1920;

	private static Object returnImageResponse(Request req, Image img, MapSettings settings, Path tempNortPath, Config cfg, Response res)
	{
		try
		{
			BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);

			// The server always returns PNG image bytes for preview/generate
			// requests. If the client indicates support for gzip, compress
			// the HTTP response body to reduce transfer size.
			return returnPngResponse(req, res, buf);
		}
		catch (Exception e)
		{
			Logger.println("returnImageResponse failed: " + e);
			res.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to produce image response: " + e.getClass().getSimpleName() + (e.getMessage() != null ? (" - " + e.getMessage()) : ""), null, null));
		}
		finally
		{
			img.close();
			cleanupTempNortPath(tempNortPath, cfg);
		}
	}

	private static Object returnJsonResponse(BufferedImage buf, MapSettings settings, Config cfg, Response res) throws IOException
	{
		buf = scaleImageIfNeeded(buf);
		byte[] bytes = serializeImageToBytes(buf);
		String nortContent = resolveBestNortContent(cfg, settings);

		res.type(CONTENT_TYPE_JSON);
		res.status(200);
		return gson.toJson(new ImageAndSettingsResponse(Base64.getEncoder().encodeToString(bytes), nortContent));
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

	// Removed fallbackNortContent: server will not attempt to fall back to alternate nort content.

	private static String serializeSettingsJson(Config cfg)
	{
		if (cfg.settings == null || cfg.settings.isEmpty())
		{
			return null;
		}

		try
		{
			return gson.toJson(cfg.settings);
		}
		catch (Exception e)
		{
			return null;
		}

	}

	private static String readNortFileContent(Config cfg)
	{
		if (cfg.nortFile == null || cfg.nortFile.isEmpty())
		{
			return null;
		}

		try
		{
			return Files.readString(Path.of(cfg.nortFile), StandardCharsets.UTF_8);
		}
		catch (Exception ignored)
		{
			return null;
		}
	}

	private static Object returnPngResponse(Request req, Response res, BufferedImage buf) throws IOException
	{
		res.type(CONTENT_TYPE_PNG);
		res.status(200);

		String acceptEnc = req.headers("Accept-Encoding");
		if (API_DEBUG) Logger.println("Accept-Encoding: " + acceptEnc);
		// Echo the header for easier client-side debugging
		res.header("X-Debug-Accept-Encoding", acceptEnc == null ? "" : acceptEnc);
		boolean useGzip = acceptEnc != null && acceptEnc.toLowerCase().contains("gzip");

		OutputStream out = res.raw().getOutputStream();
		if (useGzip) {
			// Indicate to the client that the payload is gzipped
			res.header("Content-Encoding", "gzip");
			GZIPOutputStream gos = new GZIPOutputStream(out, true);
			try {
				writeCompressedPng(buf, gos);
				gos.finish();
				gos.flush();
			} finally {
				// Do not close the underlying servlet output stream directly
				// (finish above writes gzip footer). Let the container manage it.
			}
		} else {
			writeCompressedPng(buf, out);
		}
		out.flush();
		return res.raw();
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

	private static boolean writeImageToFile(Image img, String outPath, Response res)
	{
		try
		{
			img.write(outPath);
			return true;
		}
		catch (Exception e)
		{
			res.status(500);
			return false;
		}
		finally
		{
			img.close();
		}
	}

	private static String saveNortIfRequested(MapSettings settings, String outPath, boolean providedNortContent, Config cfg, Path tempNortPath, Response res)
	{
		String nortSavedPath = null;
		try
		{
			if (cfg.saveNort != null && cfg.saveNort && providedNortContent)
			{
				String base = outPath;
				int dot = base.lastIndexOf('.');
				String nortPath = (dot > 0 ? base.substring(0, dot) : base) + NORT_EXTENSION;
				settings.writeToFile(nortPath);
				nortSavedPath = nortPath;
			}
		}
		catch (Exception e)
		{
			res.status(200);
		}
		finally
		{
			if (tempNortPath != null && !(cfg.saveNort != null && cfg.saveNort))
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
		return nortSavedPath;
	}

	private static class Config
	{
		String nortFile;
		Map<String, Object> settings;
		Integer generatedWidth;
		Integer generatedHeight;
		Long randomSeed;
		String language;
		String mapLanguage;
		String out;
		Boolean saveNort;
		Boolean returnSettings;
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
		boolean providedNortContent;

		GenerationContext(MapSettings settings, Path tempNortPath, boolean providedNortContent)
		{
			this.settings = settings;
			this.tempNortPath = tempNortPath;
			this.providedNortContent = providedNortContent;
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

	private static String colorToHex(nortantis.platform.Color c)
	{
		if (c == null)
			return null;
		int r = c.getRed();
		int g = c.getGreen();
		int b = c.getBlue();
		return String.format("#%02X%02X%02X", r, g, b);
	}

}

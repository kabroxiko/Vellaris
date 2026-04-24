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
import nortantis.TextureSource;
import nortantis.editor.UserPreferences;
import nortantis.swing.ThemePanel.LandColoringMethod;
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
import java.time.Instant;
import java.awt.image.BufferedImage;
import java.util.Base64;
import java.util.List;
import java.util.Random;
import java.util.HashSet;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Locale;
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

		get("/health", (req, res) -> "ok");

		get("/art-packs", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(Assets.listArtPacks(false));
		});

		get("/books", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			return gson.toJson(SettingsGenerator.getAllBooks());
		});

		get("/city-icon-types", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			String artPack = req.queryParams(ART_PACK);
			if (artPack == null || artPack.isEmpty())
				artPack = Assets.installedArtPack;
			PlatformFactory.setInstance(new AwtFactory());
			List<String> types = ImageCache.getInstance(artPack, null).getIconGroupNames(IconType.cities);
			return gson.toJson(types);
		});

		get("/textures", (req, res) ->
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

		get("/border-types", (req, res) ->
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

		get("/ui-options", (req, res) ->
		{
			res.type(CONTENT_TYPE_JSON);
			String requestedLanguage = req.queryParams("language");
			String previousLanguage = UserPreferences.getInstance().language;
			applyRequestLanguage(requestedLanguage);
			try
			{
				return gson.toJson(buildWebUiOptions());
			}
			finally
			{
				restorePreviousLanguage(previousLanguage);
			}
		});

		post("/generate", MapApiServer::handleGenerate);
		post("/resolve-random-settings", MapApiServer::handleResolveRandomSettings);
		post("/background-preview", MapApiServer::handleBackgroundPreview);

		exception(Exception.class, (exception, req, res) ->
		{
			Logger.println("Unhandled API exception: " + exception);
			res.type(CONTENT_TYPE_JSON);
			res.status(500);
			res.body(gson.toJson(new ApiResponse(false, "Unhandled exception: " + formatExceptionMessage(exception), null, null)));
		});

		init();
		Logger.println("Map API server started on port 8080");
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

			if (cfg.returnImageBytes != null && cfg.returnImageBytes)
			{
				return returnImageResponse(img, ctx.settings, ctx.tempNortPath, cfg, res);
			}

			String outPath = determineOutputPath(cfg, res, img);
			if (outPath == null)
			{
				return gson.toJson(new ApiResponse(false, "Failed to determine output path", null, null));
			}

			if (!writeImageToFile(img, outPath, res))
			{
				return gson.toJson(new ApiResponse(false, "Failed to write image", null, null));
			}

			String nortSavedPath = saveNortIfRequested(ctx.settings, outPath, ctx.providedNortContent, cfg, ctx.tempNortPath, res);

			res.status(200);
			return gson.toJson(new ApiResponse(true, "OK", outPath, nortSavedPath));
		}
		finally
		{
			restorePreviousLanguage(previousLanguage);
		}
	}

	private static Object handleResolveRandomSettings(Request req, Response res)
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

			return resolveRandomOnlyResponse(ctx, res);
		}
		finally
		{
			restorePreviousLanguage(previousLanguage);
		}
	}

	private static Object resolveRandomOnlyResponse(GenerationContext ctx, Response res)
	{
		try
		{
			String nortContent = ctx.settings.toJsonString();
			@SuppressWarnings("unchecked")
			Map<String, Object> settings = gson.fromJson(nortContent, Map.class);
			// Build a small map of UI-friendly default values (hex colors, numeric scales, booleans)
			Map<String, Object> uiDefaults = new LinkedHashMap<>();
			// Color fields: provide hex strings (omit alpha if fully opaque)
			if (ctx.settings.oceanShadingColor != null)
			{
				String hex = colorToHex(ctx.settings.oceanShadingColor);
				uiDefaults.put("oceanShadingColor", hex);
				uiDefaults.put("oceanShadingColorHex", hex);
			}
			if (ctx.settings.coastShadingColor != null)
			{
				String hex = colorToHex(ctx.settings.coastShadingColor);
				uiDefaults.put("coastShadingColor", hex);
				uiDefaults.put("coastShadingColorHex", hex);
			}

			// Concentric waves / effects flags
			uiDefaults.put("fadeConcentricWaves", ctx.settings.fadeConcentricWaves);
			uiDefaults.put("brokenLinesForConcentricWaves", ctx.settings.brokenLinesForConcentricWaves);

			// Scale fields
			uiDefaults.put("hillScale", ctx.settings.hillScale);
			uiDefaults.put("treeHeightScale", ctx.settings.treeHeightScale);
			uiDefaults.put("cityScale", ctx.settings.cityScale);
			uiDefaults.put("mountainScale", ctx.settings.mountainScale);
			uiDefaults.put("duneScale", ctx.settings.duneScale);

			res.type(CONTENT_TYPE_JSON);
			res.status(200);
			return gson.toJson(new ResolvedSettingsResponse(settings, uiDefaults));
		}
		catch (Exception e)
		{
			res.status(500);
			return gson.toJson(new ApiResponse(false, "Failed to serialize settings: " + e.getMessage(), null, null));
		}
		finally
		{
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
		options.put("tabs", List.of(option("background", tr("theme.tab.background", "Background")), option("border", tr("theme.tab.border", "Border")),
				option("effects", tr("theme.tab.effects", "Effects")), option("fonts", tr("theme.tab.fonts", "Fonts"))));
		options.put("dimensions", List.of(option("Square", tr("GeneratedDimension.Square", "Square")), option("Sixteen_by_9", tr("GeneratedDimension.Sixteen_by_9", "16 by 9")),
				option("Golden_Ratio", tr("GeneratedDimension.Golden_Ratio", "Golden Ratio"))));
		options.put("landShapes", List.of(option("Continents", tr("LandShape.Continents", "Continents")), option("Inland_Sea", tr("LandShape.Inland_Sea", "Inland Sea")),
				option("Scattered", tr("LandShape.Scattered", "Scattered"))));
		options.put("landColoringMethods", List.of(option("SingleColor", tr("LandColoringMethod.SingleColor", "Single color")),
				option("ColorPoliticalRegions", tr("LandColoringMethod.ColorPoliticalRegions", "Color political regions"))));
		options.put("backgroundTypes", List.of(option("FractalNoise", tr("theme.background.fractalNoise", "Fractal noise")),
				option("GeneratedFromTexture", tr("theme.background.generatedFromTexture", "Generated from texture")), option("SolidColor", tr("theme.background.solidColor", "Solid color"))));
		options.put("strokeTypes", List.of(option("Solid", tr("StrokeType.Solid", "Solid")), option("Dashes", tr("StrokeType.Dashes", "Dashes")),
				option("Rounded_Dashes", tr("StrokeType.Rounded_Dashes", "Rounded dashes")), option("Dots", tr("StrokeType.Dots", "Dots"))));
		options.put("borderPositions", List.of(option("Outside_map", tr("BorderPosition.Outside_map", "Outside map")), option("Over_map", tr("BorderPosition.Over_map", "Over map"))));
		options.put("borderColorOptions",
				List.of(option("Ocean_color", tr("BorderColorOption.Ocean_color", "Ocean color")), option("Choose_color", tr("BorderColorOption.Choose_color", "Choose color"))));
		options.put("lineStyles", List.of(option("Jagged", tr("theme.lineStyle.jagged", "Jagged")), option("Splines", tr("theme.lineStyle.splines", "Splines")),
				option("SplinesWithSmoothedCoastlines", tr("theme.lineStyle.splinesSmoothed", "Splines with smoothed coastlines"))));
		options.put("oceanWaveTypes", List.of(option("ConcentricWaves", tr("theme.waveType.concentricWaves", "Concentric waves")), option("Ripples", tr("theme.waveType.ripples", "Ripples")),
				option("None", tr("theme.waveType.none", "None"))));

		// Build a labels map only for keys that are translated by the backend (no fallbacks).
		Map<String, String> labels = new LinkedHashMap<>();
		String[] backendLabelKeys = new String[] {
				// Added keys used by web UI but previously missing from the returned labels
				"theme.landColoringMethod.label",
				"theme.randomSeed.label",
				"theme.tab.background",
				"theme.tab.border",
				"theme.tab.effects",
				"theme.tab.fonts",
				"theme.style.label",
				"theme.borderPosition.label",
				"theme.borderColor.label",
				"theme.drawBorder",
				"theme.drawGrid",
				"theme.drawRegionBoundaries",
				"theme.colorLand",
				"theme.colorOcean",
				"theme.background.label",
				"theme.texture.label",
				"theme.borderType.label",
				"theme.width.label",
				"theme.rows.label",
				"theme.landColor.label",
				"theme.oceanColor.label",
				"theme.regionBoundaryColor.title",
				"theme.regionBoundaryWidth.help",
				"theme.borderWidth.label",
				"theme.borderColor.title",
				"theme.frayEdges",
				"theme.grungeWidth.help",
				"theme.shadingWidth.label",
				"theme.fraySize.label",
				"theme.drawGrunge",
				"theme.grungeColor.label",
				"theme.lineStyle.label",
				"theme.coastlineWidth.label",
				"theme.coastlineColor.label",
				"theme.coastShadingWidth.label",
				"theme.coastShadingTransparency.label",
				"theme.coastShadingColor.label",
	                "theme.coastShadingColor.disabled",
				"theme.oceanShadingWidth.label",
				"theme.oceanShadingColor.label",
				"theme.waveType.label",
                "theme.waveWidth.label",
                "theme.waveCount.label",
                "theme.fadeOuterWaves",
                "theme.jitter",
                "theme.brokenLines",
				"theme.waveColor.label",
				"theme.drawOceanEffectsInLakes",
				"theme.riverColor.label",
				"theme.drawRoads",
				"theme.roadStyle.label",
				"theme.roadWidth.label",
				"theme.roadColor.label",
				"theme.mountainSize.label",
				"theme.hillSize.label",
				"theme.duneSize.label",
				"theme.treeHeight.label",
				"theme.citySize.label",
				"theme.enableText",
				"theme.textColor.label",
				"theme.boldBackground",
				"theme.boldBackgroundColor.label",
				"theme.titleFont.label",
				"theme.regionFont.label",
				"theme.mountainRangeFont.label",
				"theme.otherMountainsFont.label",
				"theme.citiesFont.label",
				"theme.riverLakeFont.label"
		};

		for (String k : backendLabelKeys)
		{
			String v = Translation.get(k);
			if (v != null && !v.equals(k))
			{
				// Normalize label punctuation: remove trailing colons (normal and fullwidth)
				String normalized = stripTrailingColon(v);
				labels.put(k, normalized);
			}
		}

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("options", options);
		if (!labels.isEmpty())
		{
			result.put("labels", labels);
		}

		return result;
	}

	private static Map<String, String> option(String value, String label)
	{
		Map<String, String> entry = new LinkedHashMap<>();
		entry.put("value", value);
		entry.put("label", label);
		return entry;
	}

	private static String tr(String key, String fallback)
	{
		String translated = Translation.get(key);
		return translated.equals(key) ? fallback : translated;
	}

	private static String stripTrailingColon(String s)
	{
		if (s == null)
		{
			return null;
		}
		int end = s.length();
		while (end > 0)
		{
			char c = s.charAt(end - 1);
			if (c == ':' || c == '：' || Character.isWhitespace(c))
			{
				end--;
			}
			else
			{
				break;
			}
		}
		return s.substring(0, end);
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

	private static void logHeaders(Request req)
	{
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
			Logger.println("handleGenerate: failed to log headers: " + e.getMessage());
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

		// Extract basic control fields (width/height/seed/saveNort/return flags).
		// Theme-specific form fields are intentionally NOT extracted for
		// multipart uploads: customization must be embedded into the uploaded
		// .nort JSON. This preserves backward compatibility for clients that
		// still send individual fields but prefers the JSON content.
		extractFormFields(req, cfg);
		return cfg;
	}

	private static void extractFormFields(Request req, Config cfg)
	{
		String widthStr = param(req, "width");
		String heightStr = param(req, "height");
		String seedStr = param(req, "seed");
		String saveNortStr = param(req, "saveNort");
		String returnBytesStr = param(req, "returnImageBytes");
		String returnNortContentStr = param(req, "returnNortContent");

		if (widthStr != null)
			cfg.width = Integer.valueOf(widthStr);
		if (heightStr != null)
			cfg.height = Integer.valueOf(heightStr);
		if (seedStr != null)
			cfg.seed = Long.valueOf(seedStr);
		cfg.language = param(req, "language");
		cfg.mapLanguage = param(req, "mapLanguage");
		if (saveNortStr != null)
			cfg.saveNort = Boolean.valueOf(saveNortStr);
		if (returnBytesStr != null)
			cfg.returnImageBytes = Boolean.valueOf(returnBytesStr);
		if (returnNortContentStr != null)
			cfg.returnNortContent = Boolean.valueOf(returnNortContentStr);
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
		String regionBoundaryWidth = param(req, "regionBoundaryWidth");
		if (regionBoundaryWidth != null)
			cfg.regionBoundaryWidth = Float.valueOf(regionBoundaryWidth);
		cfg.regionBoundaryColorHex = param(req, "regionBoundaryColorHex");
		String dBorder = param(req, "drawBorder");
		if (dBorder != null)
			cfg.drawBorder = Boolean.valueOf(dBorder);
		String dGrid = param(req, "drawGridOverlay");
		if (dGrid != null)
			cfg.drawGridOverlay = Boolean.valueOf(dGrid);

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
		cfg.landColoringMethod = param(req, "landColoringMethod");
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
				Logger.println(String.format("Settings edits: hasIconEdits=%s, freeIcons=%d, centerEdits=%d", hasIconEdits, freeIconsCount, centerEditsCount));
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
		Random rand = cfg.seed != null ? new Random(cfg.seed) : new Random();
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
		applyCityIconType(cfg, settings);
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

	private static void applyCityIconType(Config cfg, MapSettings settings)
	{
		if (cfg.cityIconType != null && !cfg.cityIconType.isEmpty())
		{
			settings.cityIconTypeName = cfg.cityIconType;
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
		if (cfg.seed != null)
		{
			settings.randomSeed = cfg.seed;
			// Also set background-related seeds to match for deterministic background rendering
			settings.backgroundRandomSeed = cfg.seed;
			settings.regionsRandomSeed = cfg.seed;
			settings.textRandomSeed = cfg.seed;
			settings.frayedBorderSeed = cfg.seed;
		}
	}

	private static GenerationResult generateMap(MapSettings settings, Config cfg)
	{
		Dimension dims = computeRenderDimensions(settings, cfg);

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
		if (cfg.width == null && cfg.height == null)
		{
			return null;
		}
		int defaultWidth = settings.generatedWidth > 0 ? settings.generatedWidth : 2000;
		int w = (cfg.width != null) ? cfg.width : defaultWidth;
		int defaultHeight = settings.generatedHeight > 0 ? settings.generatedHeight : 1200;
		int h = (cfg.height != null) ? cfg.height : defaultHeight;
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

	private static Object returnImageResponse(Image img, MapSettings settings, Path tempNortPath, Config cfg, Response res)
	{
		try
		{
			BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);

			if (cfg.returnNortContent != null && cfg.returnNortContent)
			{
				return returnJsonResponse(buf, settings, cfg, res);
			}

			return returnPngResponse(res, buf);
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
		try
		{
			return settings.toJsonString();
		}
		catch (Exception ignored)
		{
			return fallbackNortContent(cfg);
		}
	}

	private static String fallbackNortContent(Config cfg)
	{
		// Fallback to original source content if serialization fails for legacy settings.
		String settingsJson = serializeSettingsJson(cfg);
		if (settingsJson != null)
		{
			return settingsJson;
		}

		return readNortFileContent(cfg);
	}

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
		catch (Exception ignored)
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

	private static Object returnPngResponse(Response res, BufferedImage buf) throws IOException
	{
		res.type(CONTENT_TYPE_PNG);
		res.status(200);
		writeCompressedPng(buf, res.raw().getOutputStream());
		res.raw().getOutputStream().flush();
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
		Integer width;
		Integer height;
		Long seed;
		String language;
		String mapLanguage;
		String out;
		Boolean returnImageBytes;
		Boolean returnNortContent;
		Boolean saveNort;
		// Random map generation parameters
		String artPack;
		Integer worldSize;
		String landShape;
		Integer regionCount;
		Integer cityFrequency;
		String cityIconType;
		List<String> books;
		String dimension;
		String landColoringMethod;
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
		Float regionBoundaryWidth;
		String regionBoundaryColorHex;
		Boolean drawBorder;
		Boolean drawGridOverlay;
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
				float width = cfg.regionBoundaryWidth != null ? cfg.regionBoundaryWidth : settings.regionBoundaryStyle.width;
				settings.regionBoundaryStyle = new Stroke(strokeType, width);
			}
			catch (IllegalArgumentException ignored)
			{
				// If the stroke type is invalid, keep the existing region boundary style
			}
		}
		else if (cfg.regionBoundaryWidth != null)
		{
			settings.regionBoundaryStyle = new Stroke(settings.regionBoundaryStyle.type, cfg.regionBoundaryWidth);
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

	private static void applyLandColoringMethod(Config cfg, MapSettings settings)
	{
		if (cfg.landColoringMethod != null && !cfg.landColoringMethod.isEmpty())
		{
			try
			{
				LandColoringMethod method = LandColoringMethod.valueOf(cfg.landColoringMethod);
				settings.drawRegionColors = (method == LandColoringMethod.ColorPoliticalRegions);
			}
			catch (IllegalArgumentException ignored)
			{
				// If the coloring method is invalid, keep the existing drawing settings
			}
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

		ResolvedSettingsResponse(Map<String, Object> settings, Map<String, Object> uiDefaults)
		{
			this.settings = settings;
			this.uiDefaults = uiDefaults;
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

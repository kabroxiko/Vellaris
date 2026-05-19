package nortantis.api;

import com.google.gson.Gson;
import nortantis.BackgroundGenerator;
import nortantis.FractalBGGenerator;
import nortantis.IconType;
import nortantis.ImageCache;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.NamedResource;
import nortantis.SettingsGenerator;
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

// No direct Jetty imports here; configure server limits via system property

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.awt.image.BufferedImage;
import java.util.Base64;
import java.util.List;
import java.util.Random;
 
import java.security.SecureRandom;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.ResourceBundle;
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
	private static final String MSG_FAILED_TO_PARSE_CONFIG = "Failed to parse config";

	// Thread-safe holder for the supplier used to create MapCreator instances.
	// Use AtomicReference so updates are atomic and visible across threads
	// (volatile alone does not provide atomicity for updates).
	private static final java.util.concurrent.atomic.AtomicReference<java.util.function.Supplier<MapCreator>> mapCreatorFactory =
		new java.util.concurrent.atomic.AtomicReference<>(MapCreator::new);

	public static void main(String[] args)
	{
		CountDownLatch latch = new CountDownLatch(1);

		// Increase Jetty's max form/request content size globally to 10 MB.
		// This addresses server-side rejections when clients send large JSON
		// bodies or image uploads without requiring Jetty API access here.
		try
		{
			System.setProperty("org.eclipse.jetty.server.Request.maxFormContentSize", "10000000");
		}
		catch (SecurityException se)
		{
			// Ignore if security manager prevents setting system properties
			Logger.println("Could not set Jetty maxFormContentSize system property: " + se.getMessage());
		}
		// Initialize translations early so API endpoints using Translation.get()
		// have a valid ResourceBundle available even before any request-level
		// language handling occurs.
		nortantis.swing.translation.Translation.initialize();

		// Create and configure the Javalin app (routes declared inside config.routes)
		Javalin app = Javalin.create(config ->
		{
			// Increase Javalin's allowed request body size to 10 MB (root-level fix)
			try
			{
				config.http.maxRequestSize = 10_000_000L; // 10 MB
				Logger.println("Configured Javalin http.maxRequestSize=10000000");
			}
			catch (Exception e)
			{
				Logger.println("Could not set config.http.maxRequestSize: " + e.getMessage());
			}

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
				ctx.result(gson.toJson(new ApiResponse(false, "Unhandled exception: " + ApiUtils.formatExceptionMessage(e), null, null)));
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
				Integer w = ApiUtils.parseInteger(raw.get("width"));
				Integer h = ApiUtils.parseInteger(raw.get("height"));
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
			ApiUtils.writeCompressedPng(buffered, baos);
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
		Map<String, Object> normalized = (Map<String, Object>) ApiUtils.normalizeNumbersInObject(settingsMap);

		// Ensure `books` arrays are sorted for deterministic output,
		// then sort keys recursively to produce a deterministic canonical JSON
		ApiUtils.sortBooksInObject(normalized);
		Object sorted = ApiUtils.sortKeysInObject(normalized);
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
		if (requestedLanguage == null || requestedLanguage.isEmpty())
		{
			// Clients historically used the `lang` query parameter; accept it as an alias.
			requestedLanguage = ctx.queryParam("lang");
		}
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
		// `tabs` UI metadata removed: front-end now uses static tab ids and
		// reads labels from the translation bundle (e.g. `theme.tab.background`).
		// Avoid returning `options.tabs` to prevent UI fallbacks based on server-provided ids.
		options.put("dimensions", List.of(ApiUtils.option("Square", tr("GeneratedDimension.Square")), ApiUtils.option("Sixteen_by_9", tr("GeneratedDimension.Sixteen_by_9")),
			ApiUtils.option("Golden_Ratio", tr("GeneratedDimension.Golden_Ratio"))));
		options.put("landShapes", List.of(ApiUtils.option("Continents", tr("LandShape.Continents")), ApiUtils.option("Inland_Sea", tr("LandShape.Inland_Sea")), ApiUtils.option("Scattered", tr("LandShape.Scattered"))));
		options.put("landColoringMethods", List.of(ApiUtils.option("SingleColor", tr("LandColoringMethod.SingleColor")), ApiUtils.option("ColorPoliticalRegions", tr("LandColoringMethod.ColorPoliticalRegions"))));
		options.put("backgroundTypes", List.of(ApiUtils.option("FractalNoise", tr("theme.background.fractalNoise")), ApiUtils.option("GeneratedFromTexture", tr("theme.background.generatedFromTexture")),
			ApiUtils.option("SolidColor", tr("theme.background.solidColor"))));
		options.put("strokeTypes", List.of(ApiUtils.option("Solid", tr("StrokeType.Solid")), ApiUtils.option("Dashes", tr("StrokeType.Dashes")), ApiUtils.option("Rounded_Dashes", tr("StrokeType.Rounded_Dashes")),
			ApiUtils.option("Dots", tr("StrokeType.Dots"))));
		options.put("borderPositions", List.of(ApiUtils.option("Outside_map", tr("BorderPosition.Outside_map")), ApiUtils.option("Over_map", tr("BorderPosition.Over_map"))));
		options.put("borderColorOptions", List.of(ApiUtils.option("Ocean_color", tr("BorderColorOption.Ocean_color")), ApiUtils.option("Choose_color", tr("BorderColorOption.Choose_color"))));
		options.put("lineStyles", List.of(ApiUtils.option("Jagged", tr("theme.lineStyle.jagged")), ApiUtils.option("Splines", tr("theme.lineStyle.splines")),
			ApiUtils.option("SplinesWithSmoothedCoastlines", tr("theme.lineStyle.splinesSmoothed"))));
		options.put("oceanWaveTypes",
			List.of(ApiUtils.option("ConcentricWaves", tr("theme.waveType.concentricWaves")), ApiUtils.option("Ripples", tr("theme.waveType.ripples")), ApiUtils.option("None", tr("theme.waveType.none"))));
	}

	private static void populateGridOptions(Map<String, Object> options)
	{
		options.put("gridOverlayShapes", List.of(ApiUtils.option("Horizontal_hexes", tr("GridOverlayShape.Horizontal_hexes")), ApiUtils.option("Vertical_hexes", tr("GridOverlayShape.Vertical_hexes")),
			ApiUtils.option("Squares", tr("GridOverlayShape.Squares")), ApiUtils.option("Voronoi_polygons", tr("GridOverlayShape.Voronoi_polygons"))));
		options.put("gridOverlayOffsets", List.of(ApiUtils.option("zero", tr("GridOverlayOffset.zero")), ApiUtils.option("quarter", tr("GridOverlayOffset.quarter")), ApiUtils.option("half", tr("GridOverlayOffset.half")),
			ApiUtils.option("threeQuarters", tr("GridOverlayOffset.threeQuarters"))));
		options.put("gridOverlayLayers", List.of(ApiUtils.option("Under_icons", tr("GridOverlayLayer.Under_icons")), ApiUtils.option("Over_icons", tr("GridOverlayLayer.Over_icons"))));
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
		Map<String, Object> normalized = (Map<String, Object>) ApiUtils.normalizeNumbersInObject(defMap);
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

	private static MapSettings generateRandomMapSettings(ApiUtils.RandomMapParameters params)
	{
		Random rand = SHARED_RANDOM;
		String artPack = (params.artPack != null && !params.artPack.isEmpty()) ? params.artPack : Assets.installedArtPack;
		MapSettings settings = SettingsGenerator.generate(rand, artPack, null);
		ApiUtils.applyRandomMapParameterOverrides(params, settings);
		return settings;
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

		ApiUtils.RandomMapParameters params = tryParseParams(body);

		if (allowGenerateRandomSettings && paramsContainGenerationFields(params))
		{
			return buildContextFromParams(params);
		}

		return buildContextFromNortBody(body, params, ctx);
	}

	// Helper: attempt to parse the request body as RandomMapParameters
	private static ApiUtils.RandomMapParameters tryParseParams(String body)
	{
		try
		{
			return gson.fromJson(body, ApiUtils.RandomMapParameters.class);
		}
		catch (com.google.gson.JsonSyntaxException e)
		{
			return null;
		}
	}

	// Helper: quick check whether parsed params contain any generation fields
	private static boolean paramsContainGenerationFields(ApiUtils.RandomMapParameters p)
	{
		return p != null && (p.language != null || p.dimension != null || p.worldSize != null || p.landShape != null || p.regionCount != null || p.cityFrequency != null
				|| (p.books != null && !p.books.isEmpty()));
	}

	// Build GenerationRequestContext when params-driven generation is requested
	private static GenerationRequestContext buildContextFromParams(ApiUtils.RandomMapParameters params)
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
	private static GenerationRequestContext buildContextFromNortBody(String body, ApiUtils.RandomMapParameters params, Context ctx)
	{
		try
		{
			MapSettings settings = MapSettings.fromJson(body);
			ApiUtils.ensureIconEditsFlag(settings);
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
		Dimension dims = (generatedWidth != null || generatedHeight != null) ? ApiUtils.computeRenderDimensionsFromSettings(settings, generatedWidth, generatedHeight) : null;

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

	private static GenerationResult attemptPrimaryRender(MapSettings settings, Dimension dims)
	{
		java.util.function.Supplier<MapCreator> supplier = mapCreatorFactory.get();
		MapCreator creator = supplier.get();
		Image image = creator.createMap(settings, dims, null);
		return GenerationResult.success(image);
	}

	private static GenerationResult attemptFallbackRender(MapSettings settings, Dimension dims, Exception firstError)
	{
		try
		{
			MapSettings fallback = prepareFallbackSettings(settings);
			java.util.function.Supplier<MapCreator> supplier = mapCreatorFactory.get();
			MapCreator creator = supplier.get();
			Image fallbackImage = creator.createMap(fallback, dims, null);
			return GenerationResult.success(fallbackImage);
		}
		catch (RuntimeException fallbackError)
		{
			Logger.println("generateMap fallback render failed: " + fallbackError);
			String message = ApiUtils.buildErrorMessage(firstError, fallbackError);
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

		ApiUtils.disableFileTextureIfNeeded(fallback);
		ApiUtils.disableCustomTextureIfNeeded(fallback);
		ApiUtils.disableCustomBorderIfNeeded(fallback);

		return fallback;
	}

    

	private static Object returnJsonResponse(BufferedImage buf, MapSettings settings, Context ctx) throws IOException
	{
		buf = ApiUtils.scaleImageIfNeeded(buf);
		byte[] bytes = ApiUtils.serializeImageToBytes(buf);
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

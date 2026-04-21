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
import nortantis.swing.ThemePanel.LandColoringMethod;
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

		post("/generate", MapApiServer::handleGenerate);
		post("/background-preview", MapApiServer::handleBackgroundPreview);

		init();
		Logger.println("Map API server started on port 8080");
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
			cfg.nortFile = temp.toAbsolutePath().toString();
		}

		extractFormFields(req, cfg);
		extractThemeFormFields(req, cfg);
		return cfg;
	}

	private static void extractFormFields(Request req, Config cfg)
	{
		String widthStr = req.raw().getParameter("width");
		String heightStr = req.raw().getParameter("height");
		String seedStr = req.raw().getParameter("seed");
		String saveNortStr = req.raw().getParameter("saveNort");
		String returnBytesStr = req.raw().getParameter("returnImageBytes");
		String returnNortContentStr = req.raw().getParameter("returnNortContent");

		if (widthStr != null && !widthStr.isEmpty())
			cfg.width = Integer.valueOf(widthStr);
		if (heightStr != null && !heightStr.isEmpty())
			cfg.height = Integer.valueOf(heightStr);
		if (seedStr != null && !seedStr.isEmpty())
			cfg.seed = Long.valueOf(seedStr);
		if (saveNortStr != null && !saveNortStr.isEmpty())
			cfg.saveNort = Boolean.valueOf(saveNortStr);
		if (returnBytesStr != null && !returnBytesStr.isEmpty())
			cfg.returnImageBytes = Boolean.valueOf(returnBytesStr);
		if (returnNortContentStr != null && !returnNortContentStr.isEmpty())
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
		boolean providedNortContent = cfg.nortContent != null && !cfg.nortContent.isEmpty();
		Path tempNortPath = null;

		try
		{
			MapSettings settings;
			if (providedNortContent)
			{
				tempNortPath = Files.createTempFile("nortantis-", NORT_EXTENSION);
				Files.write(tempNortPath, cfg.nortContent.getBytes(StandardCharsets.UTF_8), StandardOpenOption.TRUNCATE_EXISTING);
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
			applyThemeOverrides(cfg, settings);

			return new GenerationContext(settings, tempNortPath, providedNortContent);
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
			// Fallback to original source content if serialization fails for legacy settings.
			if (cfg.nortContent != null && !cfg.nortContent.isEmpty())
			{
				return cfg.nortContent;
			}
			if (cfg.nortFile != null && !cfg.nortFile.isEmpty())
			{
				try
				{
					return Files.readString(Path.of(cfg.nortFile), StandardCharsets.UTF_8);
				}
				catch (Exception ignored2)
				{
					return null;
				}
			}
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
		String nortContent;
		Integer width;
		Integer height;
		Long seed;
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
}

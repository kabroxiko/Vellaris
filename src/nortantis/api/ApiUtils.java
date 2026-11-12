package nortantis.api;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import nortantis.geom.Dimension;
import nortantis.MapSettings;

public final class ApiUtils
{
	static class RandomMapParameters
	{
		String language;
		String dimension;
		Integer worldSize;
		String landShape;
		Integer regionCount;
		Boolean drawRegionColors;
		Boolean drawRegionBoundaries;
		Double cityProbability;
		List<String> books;
		String artPack;
		String cityIconSetName;
		/**
		 * Seed for every random choice the generated settings make. Absent means the server picks one, which is what a caller that only
		 * wants "a map like this" sends; present means the caller wants this exact world again.
		 */
		Long randomSeed;
		// The rest pin rendering choices the generator would otherwise decide at random, so a caller can ask for a map that always has
		// political regions drawn, a decorative border, shaded shores or a grid, instead of one draw in four having them.
		Boolean drawBorder;
		Boolean frayedBorder;
		Integer coastShadingLevel;
		Double coastlineWidth;
		String lineStyle;
		Boolean drawGridOverlay;
		String gridOverlayShape;
		Integer gridOverlayRowOrColCount;
		Integer gridOverlayLineWidth;
		String gridOverlayLayer;
		Boolean drawVoronoiGridOverlayOnlyOnLand;
		/**
		 * Explicit picture size in pixels. {@link #dimension} names a fixed size (16:9 is 4096 wide), which is a sensible default but soft
		 * on a large screen or when the picture is zoomed into. Every coordinate the world reports is a fraction of the picture, so asking
		 * for more pixels sharpens the picture and changes nothing about the world. One side alone keeps the aspect ratio the dimension
		 * already set, and these win over it when both are given.
		 */
		Integer generatedWidth;
		Integer generatedHeight;
	}

	public static void ensureIconEditsFlag(MapSettings settings)
	{
		try
		{
			if (settings.edits != null)
			{
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

	public static void applyRandomMapParameterOverrides(RandomMapParameters p, MapSettings settings)
	{
		if (p == null || settings == null)
			return;
		if (p.randomSeed != null)
		{
			// The seeds move together so the graph, the background, the regions and the names all belong to the same world.
			settings.randomSeed = p.randomSeed;
			settings.backgroundRandomSeed = p.randomSeed;
			settings.regionsRandomSeed = p.randomSeed;
			settings.textRandomSeed = p.randomSeed;
			settings.frayedBorderSeed = p.randomSeed;
		}
		if (p.worldSize != null)
			settings.worldSize = p.worldSize;
		if (p.cityIconSetName != null && !p.cityIconSetName.isEmpty())
			settings.cityIconTypeName = p.cityIconSetName;
		if (p.landShape != null && !p.landShape.isEmpty())
		{
			settings.landShape = parseEnum(nortantis.LandShape.class, p.landShape, settings.landShape);
		}
		if (p.regionCount != null)
			settings.regionCount = p.regionCount;
		if (p.cityProbability != null)
			settings.cityProbability = p.cityProbability;
		if (p.books != null && !p.books.isEmpty())
			settings.books = new java.util.HashSet<>(p.books);
		applyDimensionOverride(p, settings);
		applyExplicitRenderDimensions(p, settings);
		if (p.drawRegionColors != null)
			settings.drawRegionColors = p.drawRegionColors;
		if (p.drawRegionBoundaries != null)
			settings.drawRegionBoundaries = p.drawRegionBoundaries;
		if (p.drawBorder != null)
			settings.drawBorder = p.drawBorder;
		if (p.frayedBorder != null)
			settings.frayedBorder = p.frayedBorder;
		if (p.coastShadingLevel != null)
			settings.coastShadingLevel = p.coastShadingLevel;
		if (p.coastlineWidth != null)
			settings.coastlineWidth = p.coastlineWidth;
		if (p.lineStyle != null && !p.lineStyle.isEmpty())
			settings.lineStyle = parseEnum(nortantis.MapSettings.LineStyle.class, p.lineStyle, settings.lineStyle);
		if (p.drawGridOverlay != null)
			settings.drawGridOverlay = p.drawGridOverlay;
		if (p.gridOverlayShape != null && !p.gridOverlayShape.isEmpty())
			settings.gridOverlayShape = parseEnum(nortantis.GridOverlayShape.class, p.gridOverlayShape, settings.gridOverlayShape);
		if (p.gridOverlayRowOrColCount != null)
			settings.gridOverlayRowOrColCount = p.gridOverlayRowOrColCount;
		if (p.gridOverlayLineWidth != null)
			settings.gridOverlayLineWidth = p.gridOverlayLineWidth;
		if (p.gridOverlayLayer != null && !p.gridOverlayLayer.isEmpty())
			settings.gridOverlayLayer = parseEnum(nortantis.MapSettings.GridOverlayLayer.class, p.gridOverlayLayer, settings.gridOverlayLayer);
		if (p.drawVoronoiGridOverlayOnlyOnLand != null)
			settings.drawVoronoiGridOverlayOnlyOnLand = p.drawVoronoiGridOverlayOnlyOnLand;
	}

	/**
	 * Reads an enum the way settings documents write one: a name, with spaces where the display name has them.
	 */
	private static <E extends Enum<E>> E parseEnum(Class<E> type, String value, E fallback)
	{
		try
		{
			return Enum.valueOf(type, value.trim().replace(' ', '_'));
		}
		catch (IllegalArgumentException e)
		{
			return fallback;
		}
	}

	public static void applyDimensionOverride(RandomMapParameters p, MapSettings settings)
	{
		if (p == null || settings == null)
			return;
		if (p.dimension == null || p.dimension.isEmpty())
			return;
		try
		{
			nortantis.GeneratedDimension dim = nortantis.GeneratedDimension.valueOf(p.dimension);
			if (dim != nortantis.GeneratedDimension.Custom)
			{
				settings.generatedWidth = dim.width;
				settings.generatedHeight = dim.height;
			}
		}
		catch (IllegalArgumentException ignored)
		{
			// ignore invalid
		}
	}

	/**
	 * Smallest and largest picture side a short document may ask for. The lower bound keeps a map readable; the upper one keeps a
	 * request from asking the renderer for an image big enough to exhaust the process, which is a server concern rather than the
	 * caller's, since the caller only ever means "sharper than the preset".
	 */
	public static final int MIN_RENDER_DIMENSION = 256;

	public static final int MAX_RENDER_DIMENSION = 16384;

	/**
	 * Applies an explicit picture size from a short document, after the named dimension has set the aspect ratio.
	 *
	 * Both sides given are used as given. One side given keeps the ratio the settings already carry, so a caller that only knows the
	 * width it wants does not have to repeat the height.
	 */
	public static void applyExplicitRenderDimensions(RandomMapParameters p, MapSettings settings)
	{
		if (p == null || settings == null)
			return;
		boolean hasWidth = p.generatedWidth != null && p.generatedWidth > 0;
		boolean hasHeight = p.generatedHeight != null && p.generatedHeight > 0;
		if (!hasWidth && !hasHeight)
			return;

		int width = hasWidth ? clampRenderDimension(p.generatedWidth) : 0;
		int height = hasHeight ? clampRenderDimension(p.generatedHeight) : 0;
		double aspect = (settings.generatedWidth > 0 && settings.generatedHeight > 0) ? (double) settings.generatedWidth / settings.generatedHeight : 16.0 / 9.0;

		if (width > 0 && height > 0)
		{
			settings.generatedWidth = width;
			settings.generatedHeight = height;
		}
		else if (width > 0)
		{
			settings.generatedWidth = width;
			settings.generatedHeight = clampRenderDimension((int) Math.round(width / aspect));
		}
		else
		{
			settings.generatedHeight = height;
			settings.generatedWidth = clampRenderDimension((int) Math.round(height * aspect));
		}
	}

	private static int clampRenderDimension(int value)
	{
		return Math.max(MIN_RENDER_DIMENSION, Math.min(MAX_RENDER_DIMENSION, value));
	}

	public static void disableFileTextureIfNeeded(MapSettings fallback)
	{
		if (fallback == null)
			return;
		if (fallback.backgroundTextureSource == nortantis.TextureSource.File)
		{
			fallback.generateBackgroundFromTexture = false;
			fallback.solidColorBackground = true;
			fallback.backgroundTextureImage = "";
		}
	}

	public static void disableCustomTextureIfNeeded(MapSettings fallback)
	{
		if (fallback == null)
			return;
		if (fallback.backgroundTextureResource != null && nortantis.util.Assets.customArtPack.equals(fallback.backgroundTextureResource.artPack))
		{
			fallback.generateBackgroundFromTexture = false;
			fallback.solidColorBackground = true;
			fallback.backgroundTextureResource = null;
		}
	}

	public static void disableCustomBorderIfNeeded(MapSettings fallback)
	{
		if (fallback == null)
			return;
		if (fallback.borderResource != null && nortantis.util.Assets.customArtPack.equals(fallback.borderResource.artPack))
		{
			fallback.drawBorder = false;
			fallback.borderResource = null;
		}
	}

	public static Integer parseInteger(Object v)
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

	public static String formatExceptionMessage(Exception exception)
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

	public static Map<String, String> option(String value, String label)
	{
		Map<String, String> entry = new LinkedHashMap<>();
		entry.put("value", value);
		entry.put("label", label);
		return entry;
	}

	public static nortantis.GeneratedDimension parseGeneratedDimension(String name)
	{
		if (name == null || name.isEmpty())
			return null;
		try
		{
			return nortantis.GeneratedDimension.valueOf(name);
		}
		catch (IllegalArgumentException e)
		{
			return null;
		}
	}

	public static Object sortKeysInObject(Object o)
	{
		if (o == null)
			return null;
		if (o instanceof Map)
			return sortMap((Map<?, ?>) o);
		if (o instanceof List)
			return sortList((List<?>) o);
		return o;
	}

	public static Map<String, Object> sortMap(Map<?, ?> m)
	{
		java.util.TreeMap<String, Object> out = new java.util.TreeMap<>();
		for (Map.Entry<?, ?> e : m.entrySet())
		{
			String k = String.valueOf(e.getKey());
			out.put(k, sortKeysInObject(e.getValue()));
		}
		return out;
	}

	public static List<Object> sortList(List<?> l)
	{
		List<Object> out = new java.util.ArrayList<>(l.size());
		for (Object v : l)
			out.add(sortKeysInObject(v));
		return out;
	}

	public static void sortBooksInObject(Object o)
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

	public static void processMapForBooks(Map<?, ?> m)
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

	@SuppressWarnings("unchecked")
	public static void sortBooksListInMap(Map<?, ?> m, String key, Object v)
	{
		try
		{
			List<Object> lst = new java.util.ArrayList<>((List<Object>) v);
			lst.sort((a, b) -> String.valueOf(a).compareTo(String.valueOf(b)));
			Map<String, Object> mm = (Map<String, Object>) m;
			mm.put(key, lst);
		}
		catch (ClassCastException | NullPointerException ignore)
		{
			// best-effort sorting; ignore malformed entries
		}
	}

	public static Object normalizeNumbersInObject(Object o)
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

	public static Map<Object, Object> normalizeMap(Map<?, ?> m)
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

	public static List<Object> normalizeList(List<?> l)
	{
		List<Object> out = new java.util.ArrayList<>(l.size());
		for (Object v : l)
			out.add(normalizeNumbersInObject(v));
		return out;
	}

	public static Object normalizeNumber(Number n)
	{
		if (n instanceof BigDecimal bd)
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

	private static final int MAX_BASE64_PREVIEW_DIMENSION = 1920;

	public static BufferedImage scaleImageIfNeeded(BufferedImage buf)
	{
		return scaleImageToMaxDimension(buf, MAX_BASE64_PREVIEW_DIMENSION);
	}

	/**
	 * Scales the image down so neither side exceeds maxDimension.
	 *
	 * This exists so the base64 representations can stay small, but it destroys detail, so callers that genuinely deliver the map - the raw
	 * image route - pass null to keep the full-resolution render instead of silently handing back a 1920px preview of a much larger map.
	 */
	public static BufferedImage scaleImageToMaxDimension(BufferedImage buf, Integer maxDimension)
	{
		if (maxDimension == null || maxDimension <= 0)
		{
			return buf;
		}

		if (buf.getWidth() > maxDimension || buf.getHeight() > maxDimension)
		{
			double scale = Math.min((double) maxDimension / buf.getWidth(), (double) maxDimension / buf.getHeight());
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

	/** Quality used when a caller does not ask for a specific one. High enough that the fine coastline strokes survive. */
	public static final float DEFAULT_JPEG_QUALITY = 0.92f;

	public static byte[] serializeImageToBytes(BufferedImage buf) throws IOException
	{
		return serializeImageToBytes(buf, DEFAULT_JPEG_QUALITY);
	}

	public static byte[] serializeImageToBytes(BufferedImage buf, float quality) throws IOException
	{
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
		{
			writeCompressedJpeg(buf, baos, quality);
			baos.flush();
			return baos.toByteArray();
		}
	}

	/**
	 * Writes the image as JPEG.
	 *
	 * JPEG has no alpha channel, so transparency is flattened onto white first. Maps are normally painted edge to edge and lose nothing,
	 * but a transparent map (a frayed border, for instance) would otherwise come out with black where it used to be see-through.
	 *
	 * @param quality
	 *            0.0 to 1.0. Lower values produce visibly worse text and coastline strokes, which is most of what a map is made of.
	 */
	public static void writeCompressedJpeg(BufferedImage image, OutputStream outputStream, float quality) throws IOException
	{
		BufferedImage opaque = toOpaqueRgb(image);

		java.util.Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
		if (!writers.hasNext())
		{
			ImageIO.write(opaque, "jpeg", outputStream);
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
				param.setCompressionQuality(Math.max(0.0f, Math.min(1.0f, quality)));
			}
			writer.write(null, new IIOImage(opaque, null, null), param);
		}
		finally
		{
			writer.dispose();
		}
	}

	/**
	 * Flattens any transparency onto white and returns a JPEG-compatible image.
	 */
	public static BufferedImage toOpaqueRgb(BufferedImage image)
	{
		if (image.getType() == BufferedImage.TYPE_INT_RGB)
		{
			return image;
		}

		BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
		java.awt.Graphics2D g = rgb.createGraphics();
		try
		{
			g.setColor(java.awt.Color.WHITE);
			g.fillRect(0, 0, image.getWidth(), image.getHeight());
			g.drawImage(image, 0, 0, null);
		}
		finally
		{
			g.dispose();
		}
		return rgb;
	}

	private ApiUtils()
	{
	}

	public static Dimension computeRenderDimensions(int defaultWidth, int defaultHeight, Integer generatedWidth, Integer generatedHeight)
	{
		int w = (generatedWidth != null) ? generatedWidth : defaultWidth;
		int h = (generatedHeight != null) ? generatedHeight : defaultHeight;
		return new Dimension(w, h);
	}

	public static Dimension computeRenderDimensionsFromSettings(MapSettings settings, Integer generatedWidth, Integer generatedHeight)
	{
		int defaultWidth = (settings != null && settings.generatedWidth > 0) ? settings.generatedWidth : 2000;
		int defaultHeight = (settings != null && settings.generatedHeight > 0) ? settings.generatedHeight : 1200;
		return computeRenderDimensions(defaultWidth, defaultHeight, generatedWidth, generatedHeight);
	}

	public static String buildErrorMessage(Exception firstError, Exception fallbackError)
	{
		return "Failed to generate map: " + fallbackError.getClass().getSimpleName() + (fallbackError.getMessage() != null ? (" - " + fallbackError.getMessage()) : "") + " (primary error: "
				+ firstError.getClass().getSimpleName() + (firstError.getMessage() != null ? (" - " + firstError.getMessage()) : "") + ")";
	}
}

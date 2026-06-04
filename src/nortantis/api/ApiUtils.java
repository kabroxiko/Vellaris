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
		Double cityProbability;
		List<String> books;
		String artPack;
		String cityIconSetName;
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
		if (p.worldSize != null)
			settings.worldSize = p.worldSize;
		if (p.cityIconSetName != null && !p.cityIconSetName.isEmpty())
			settings.cityIconTypeName = p.cityIconSetName;
		if (p.landShape != null && !p.landShape.isEmpty())
		{
			try
			{
				settings.landShape = nortantis.LandShape.valueOf(p.landShape);
			}
			catch (IllegalArgumentException ignored)
			{
				// ignore invalid
			}
		}
		if (p.regionCount != null)
			settings.regionCount = p.regionCount;
		if (p.cityProbability != null)
			settings.cityProbability = p.cityProbability;
		if (p.books != null && !p.books.isEmpty())
			settings.books = new java.util.HashSet<>(p.books);
		applyDimensionOverride(p, settings);
		if (p.drawRegionColors != null)
			settings.drawRegionColors = p.drawRegionColors;
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

	public static byte[] serializeImageToBytes(BufferedImage buf) throws IOException
	{
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream())
		{
			writeCompressedPng(buf, baos);
			baos.flush();
			return baos.toByteArray();
		}
	}

	public static void writeCompressedPng(BufferedImage image, OutputStream outputStream) throws IOException
	{
		java.util.Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("png");
		if (!writers.hasNext())
		{
			ImageIO.write(image, "png", outputStream);
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
				param.setCompressionQuality(0.95f);
			}
			writer.write(null, new IIOImage(image, null, null), param);
		}
		finally
		{
			writer.dispose();
		}
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

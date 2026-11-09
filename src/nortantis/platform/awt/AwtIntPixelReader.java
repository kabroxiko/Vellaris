package nortantis.platform.awt;

import nortantis.geom.IntRectangle;

import java.awt.image.DataBufferInt;

public class AwtIntPixelReader extends AwtPixelReader
{
	protected final int[] cachedPixelArray;

	AwtIntPixelReader(AwtImage image, IntRectangle bounds)
	{
		super(image, bounds);
		this.cachedPixelArray = ((DataBufferInt) raster.getDataBuffer()).getData();
	}

	AwtIntPixelReader(AwtImage image)
	{
		this(image, null);
	}

	@Override
	public int getRGB(int x, int y)
	{
		int rgb = cachedPixelArray[(y * image.getWidth()) + x];
		// For non-alpha images (TYPE_INT_RGB), the high byte is undefined garbage.
		// Normalize it to 0xFF to match BufferedImage.getRGB() behavior.
		if (!image.hasAlpha())
		{
			rgb |= 0xFF000000;
		}
		return rgb;
	}

	@Override
	public void getRGBs(int x, int y, int count, int[] dest)
	{
		int offset = (y * image.getWidth()) + x;
		if (image.hasAlpha())
		{
			System.arraycopy(cachedPixelArray, offset, dest, 0, count);
			return;
		}
		for (int i = 0; i < count; i++)
		{
			dest[i] = cachedPixelArray[offset + i] | 0xFF000000;
		}
	}
}

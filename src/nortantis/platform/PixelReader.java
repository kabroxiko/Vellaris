package nortantis.platform;

import nortantis.geom.IntRectangle;

public interface PixelReader extends AutoCloseable
{
	/**
	 * Refreshes the cached pixel data for the given region by re-reading from the source image. For implementations that maintain a live
	 * view of the image data (like AWT), this is a no-op.
	 */
	void refreshRegion(IntRectangle bounds);

	int getGrayLevel(int x, int y);

	/**
	 * Reads {@code count} gray levels starting at column {@code x} of row {@code y} into {@code dest}, beginning at index 0. This is
	 * equivalent to calling {@link #getGrayLevel(int, int)} for each column in the run, but avoids one virtual call and sample-model lookup
	 * per pixel.
	 */
	void getGrayLevels(int x, int y, int count, int[] dest);

	int getBandLevel(int x, int y, int band);

	int getRGB(int x, int y);

	/**
	 * Reads {@code count} pixels starting at column {@code x} of row {@code y} into {@code dest} as packed ARGB values, beginning at index
	 * 0. This is equivalent to calling {@link #getRGB(int, int)} for each column in the run.
	 */
	void getRGBs(int x, int y, int count, int[] dest);

	Color getPixelColor(int x, int y);

	float getNormalizedPixelLevel(int x, int y);

	int getAlpha(int x, int y);

	@Override
	void close();
}

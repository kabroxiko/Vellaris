package nortantis;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapSettings.LineStyle;
import nortantis.graph.voronoi.Center;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Guards against process-wide mutable state leaking between concurrently generated graphs.
 *
 * TectonicPlate.hashCode used to be backed by a static id counter that WorldGraph reset in its constructor, so two graphs being built at
 * the same time handed out interleaved ids. Because the plates live in HashSets, that changed the iteration order that drives plate growth,
 * and identical requests returned visibly different maps. These tests build graphs from an identical seed and require identical results.
 */
public class ConcurrentGraphCreationTest
{
	private static final int width = 1200;
	private static final int height = 900;
	private static final int numSites = 4000;
	private static final long seed = 8675309L;

	@BeforeAll
	public static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();
	}

	private static WorldGraph buildGraph()
	{
		Random r = new Random(seed);
		return GraphCreator.createGraph(width, height, numSites, 0.5, 0.5, r, 1.0, LineStyle.SplinesWithSmoothedCoastlines, 1.0, true, 2.0, true, 0, false, false, LandShape.Continents, 12);
	}

	/**
	 * Describes everything about a graph that plate iteration order can influence: elevation, moisture, biome, and which plate each center
	 * belongs to. Plates are labelled by order of first appearance over centers sorted by index, so the fingerprint captures the plate
	 * partition without depending on the plate ids themselves.
	 */
	private static String fingerprint(WorldGraph graph)
	{
		List<Center> centers = new ArrayList<>(graph.centers);
		centers.sort((a, b) -> Integer.compare(a.index, b.index));

		Map<TectonicPlate, Integer> plateLabels = new IdentityHashMap<>();
		StringBuilder builder = new StringBuilder(centers.size() * 8);
		for (Center c : centers)
		{
			plateLabels.putIfAbsent(c.tectonicPlate, plateLabels.size());
			builder.append(c.index).append(':').append(Double.doubleToLongBits(c.elevation)).append(':').append(Double.doubleToLongBits(c.moisture)).append(':')
					.append(c.biome == null ? -1 : c.biome.ordinal()).append(':').append(plateLabels.get(c.tectonicPlate)).append(';');
		}
		return builder.toString();
	}

	@Test
	public void serialGraphCreationIsRepeatable()
	{
		String first = fingerprint(buildGraph());
		String second = fingerprint(buildGraph());
		assertEquals(first, second, "Two graphs built sequentially from the same seed must match.");
	}

	@Test
	public void concurrentGraphCreationMatchesSerialBaseline() throws Exception
	{
		String baseline = fingerprint(buildGraph());

		int threadCount = 4;
		ExecutorService pool = Executors.newFixedThreadPool(threadCount);
		try
		{
			List<Callable<String>> jobs = new ArrayList<>();
			for (int i = 0; i < threadCount; i++)
			{
				jobs.add(() -> fingerprint(buildGraph()));
			}

			List<Future<String>> futures = pool.invokeAll(jobs);
			for (int i = 0; i < futures.size(); i++)
			{
				assertEquals(baseline, futures.get(i).get(), "Graph " + i + " built concurrently differs from the serial baseline. Some mutable state is shared between generations.");
			}
		}
		finally
		{
			pool.shutdownNow();
		}
	}
}

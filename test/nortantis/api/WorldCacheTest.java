package nortantis.api;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.WorldGraph;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;

import java.nio.file.Paths;

/**
 * Covers the cache that stops the query endpoints from rebuilding a world on every request. Its safety rests on one property: a world is a
 * pure function of its settings, so a key derived from the settings can never point at a world that disagrees with them.
 */
class WorldCacheTest
{
	private static final String settingsPath = Paths.get("unit test files", "map settings", "minimal.nort").toAbsolutePath().toString();

	private static WorldGraph graph;

	@BeforeAll
	static void setUp()
	{
		PlatformFactory.setInstance(new AwtFactory());
		nortantis.i18n.Translation.initialize();

		// One real graph is enough: the cache only stores and returns references.
		graph = MapCreator.createGraphForUnitTests(new MapSettings(settingsPath));
	}

	/**
	 * A default-constructed MapSettings cannot be serialized, so build one from the fixture and vary the seed.
	 */
	private static MapSettings settingsWithSeed(long seed)
	{
		MapSettings settings = new MapSettings(settingsPath);
		settings.randomSeed = seed;
		return settings;
	}

	@Test
	void keyIsStableForEquivalentSettings()
	{
		assertEquals(WorldCache.keyFor(settingsWithSeed(42)), WorldCache.keyFor(settingsWithSeed(42)));
	}

	@Test
	void keyChangesWhenTheSettingsChange()
	{
		assertNotEquals(WorldCache.keyFor(settingsWithSeed(42)), WorldCache.keyFor(settingsWithSeed(43)), "A different world must not share a cache entry");
	}

	@Test
	void storedWorldIsReturned()
	{
		WorldCache cache = new WorldCache(2);
		MapSettings settings = settingsWithSeed(7);

		cache.put(WorldCache.keyFor(settings), settings, graph);

		WorldCache.Entry entry = cache.get(WorldCache.keyFor(settings));
		assertNotNull(entry);
		assertSame(graph, entry.graph);
		assertSame(settings, entry.settings);
	}

	@Test
	void missingKeyReturnsNull()
	{
		WorldCache cache = new WorldCache(2);
		assertNull(cache.get("no-such-world"));
	}

	@Test
	void aFailedGenerationIsNotCached()
	{
		WorldCache cache = new WorldCache(2);
		cache.put("key", settingsWithSeed(1), null);
		assertEquals(0, cache.size(), "A world with no graph must not be stored");
	}

	@Test
	void oldestEntryIsEvictedWhenFull()
	{
		WorldCache cache = new WorldCache(2);
		cache.put("a", settingsWithSeed(1), graph);
		cache.put("b", settingsWithSeed(2), graph);
		cache.put("c", settingsWithSeed(3), graph);

		assertEquals(2, cache.size());
		assertNull(cache.get("a"), "The least recently used world should have been evicted");
		assertNotNull(cache.get("b"));
		assertNotNull(cache.get("c"));
	}

	@Test
	void readingAnEntryKeepsItFromBeingEvicted()
	{
		WorldCache cache = new WorldCache(2);
		cache.put("a", settingsWithSeed(1), graph);
		cache.put("b", settingsWithSeed(2), graph);

		// Touch "a" so it becomes the most recently used, then overflow.
		assertNotNull(cache.get("a"));
		cache.put("c", settingsWithSeed(3), graph);

		assertNotNull(cache.get("a"), "A recently read world should survive eviction");
		assertNull(cache.get("b"));
	}

	@Test
	void capacityZeroDisablesCaching()
	{
		WorldCache cache = new WorldCache(0);
		assertEquals(0, cache.getMaxEntries());
		cache.put("a", settingsWithSeed(1), graph);
		assertEquals(0, cache.size(), "Caching must be fully off when the capacity is zero");
	}
}

package nortantis.api;

import nortantis.MapSettings;
import nortantis.WorldGraph;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Keeps a few recently generated worlds in memory so the query endpoints do not rebuild the map on every request.
 *
 * A world is a pure function of its settings, so an entry keyed by the settings' own content can never go stale: the same settings always
 * describe the same world. That is what makes caching safe here rather than another source of inconsistency.
 *
 * Entries hold the settings and the graph, never a rendered image, so the cost of an entry is the graph. The number of worlds kept is
 * bounded and can be tuned with {@code -Dvellaris.worldCacheSize=N}; 0 disables caching.
 */
public final class WorldCache
{
	public static final int DEFAULT_MAX_ENTRIES = 3;
	public static final String SIZE_PROPERTY = "vellaris.worldCacheSize";

	private static final WorldCache instance = new WorldCache(Integer.getInteger(SIZE_PROPERTY, DEFAULT_MAX_ENTRIES));

	private final int maxEntries;

	/** Access-ordered so the least recently used world is the one evicted. Guarded by synchronizing on the map itself. */
	private final Map<String, Entry> entries;

	/** Visible for tests, which need to exercise eviction with an explicit capacity. */
	WorldCache(int maxEntries)
	{
		this.maxEntries = Math.max(0, maxEntries);
		this.entries = new LinkedHashMap<>(16, 0.75f, true)
		{
			private static final long serialVersionUID = 1L;

			@Override
			protected boolean removeEldestEntry(Map.Entry<String, Entry> eldest)
			{
				return size() > WorldCache.this.maxEntries;
			}
		};
	}

	public static WorldCache getInstance()
	{
		return instance;
	}

	/**
	 * Identifies a world by the content of its settings.
	 */
	public static String keyFor(MapSettings settings)
	{
		String json = settings.toJsonString();
		try
		{
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(json.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException e)
		{
			throw new IllegalStateException("SHA-256 is required by the platform", e);
		}
	}

	public Entry get(String key)
	{
		synchronized (entries)
		{
			return entries.get(key);
		}
	}

	/**
	 * Stores a world. A null graph, which happens when the generation failed, is not cached.
	 */
	public void put(String key, MapSettings settings, WorldGraph graph)
	{
		if (maxEntries == 0 || graph == null)
		{
			return;
		}

		synchronized (entries)
		{
			entries.put(key, new Entry(settings, graph));
		}
	}

	public int size()
	{
		synchronized (entries)
		{
			return entries.size();
		}
	}

	public int getMaxEntries()
	{
		return maxEntries;
	}

	public void clear()
	{
		synchronized (entries)
		{
			entries.clear();
		}
	}

	/** A generated world: the settings that describe it and the graph it was built from. */
	public static final class Entry
	{
		public final MapSettings settings;
		public final WorldGraph graph;

		Entry(MapSettings settings, WorldGraph graph)
		{
			this.settings = settings;
			this.graph = graph;
		}
	}
}

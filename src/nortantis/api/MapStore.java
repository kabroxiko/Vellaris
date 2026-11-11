package nortantis.api;

import com.google.gson.Gson;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Updates;
import nortantis.util.Logger;
import org.bson.Document;
import org.bson.types.Binary;
import org.bson.types.ObjectId;

import java.util.Date;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Stores generated worlds so a client can refer to one by id instead of carrying its settings, its description and its image around.
 *
 * A world is fully determined by the settings that produced it, so a stored map is an immutable record: nothing here updates a world, and
 * reading one only moves its last-access time. The canonical settings are kept beside the world because a route query needs them to rebuild
 * the graph, and the rendered image is kept in its own collection so a large map image can never push the description past MongoDB's
 * document limit.
 *
 * Persistence is opt-in and configuration-driven: with no {@code VELLARIS_MONGO_URI} the map service stays stateless and answers exactly as
 * it did before, which is what the public generator and its tests use.
 */
public final class MapStore implements AutoCloseable
{
	/** Connection string for the database that holds stored worlds. Unset keeps the service stateless. */
	public static final String MONGO_URI_ENV = "VELLARIS_MONGO_URI";

	/** Database name to use when the connection string does not name one. */
	public static final String MONGO_DB_ENV = "VELLARIS_MONGO_DB";

	/** Default database name, used when neither the connection string nor {@link #MONGO_DB_ENV} names one. */
	public static final String MONGO_DB_DEFAULT = "vellaris";

	/** Optional lifetime, in seconds, after a stored map's last read. Zero or unset keeps maps forever. */
	public static final String MAP_TTL_SECONDS_ENV = "VELLARIS_MAP_TTL_SECONDS";

	private static final String MAPS_COLLECTION = "maps";
	private static final String IMAGES_COLLECTION = "map_images";

	private final MongoClient client;
	private final MongoCollection<Document> maps;
	private final MongoCollection<Document> images;
	private final Gson gson;

	private MapStore(MongoClient client, MongoCollection<Document> maps, MongoCollection<Document> images, Gson gson)
	{
		this.client = client;
		this.maps = maps;
		this.images = images;
		this.gson = gson;
	}

	/**
	 * Builds the store from the process environment, or returns null when no database is configured.
	 *
	 * A null answer is the normal stateless mode, not a failure: the map service is usable without a database, and only a caller that asks
	 * for a stored map needs one.
	 */
	public static MapStore fromEnvironment()
	{
		String uri = trimToNull(System.getenv(MONGO_URI_ENV));
		if (uri == null)
		{
			return null;
		}

		String database = trimToNull(System.getenv(MONGO_DB_ENV));
		if (database == null)
		{
			database = MONGO_DB_DEFAULT;
		}

		MongoClient client = MongoClients.create(uri);
		MongoCollection<Document> maps = client.getDatabase(database).getCollection(MAPS_COLLECTION);
		MongoCollection<Document> images = client.getDatabase(database).getCollection(IMAGES_COLLECTION);
		applyRetentionIndex(maps);
		return new MapStore(client, maps, images, new Gson());
	}

	/**
	 * Sets up the expiry index when a retention period is configured. A failure is logged rather than thrown: losing retention is worth a
	 * warning, while refusing to start would take the whole map service down over housekeeping.
	 */
	private static void applyRetentionIndex(MongoCollection<Document> maps)
	{
		String configured = trimToNull(System.getenv(MAP_TTL_SECONDS_ENV));
		if (configured == null)
		{
			return;
		}

		long seconds;
		try
		{
			seconds = Long.parseLong(configured);
		}
		catch (NumberFormatException e)
		{
			Logger.println("Ignoring " + MAP_TTL_SECONDS_ENV + "=" + configured + ": it is not a whole number of seconds");
			return;
		}
		if (seconds <= 0)
		{
			return;
		}

		try
		{
			maps.createIndex(Indexes.ascending("lastAccessedAt"), new IndexOptions().expireAfter(seconds, TimeUnit.SECONDS));
		}
		catch (RuntimeException e)
		{
			Logger.println("Could not create the map retention index: " + e.getMessage());
		}
	}

	/** Stores a generated world and its image together, and returns the id that names them from now on. */
	public String save(long seed, Document settings, Document world, byte[] image, String contentType)
	{
		ObjectId id = new ObjectId();
		Date now = new Date();
		maps.insertOne(new Document("_id", id).append("seed", seed).append("settings", settings).append("world", world).append("createdAt", now).append("lastAccessedAt", now));

		if (image != null && image.length > 0)
		{
			images.insertOne(new Document("_id", id).append("contentType", contentType).append("data", image).append("createdAt", now));
		}
		Logger.println("Stored map " + id.toHexString() + " (seed " + seed + ", " + (image == null ? 0 : image.length) + " image bytes)");
		return id.toHexString();
	}

	/**
	 * Rewrites a stored world in place, keeping its id and seed so every caller that already names this map keeps working.
	 *
	 * This exists for the one change a world can legitimately receive after generation: a place the story needed marked. The settings are
	 * replaced with the edited ones, the world description with what those settings now produce, and the image with the new render, so the
	 * three never disagree. Returns false when the id names nothing this store holds.
	 */
	public boolean update(String mapId, Document settings, Document world, byte[] image, String contentType)
	{
		ObjectId id = parseId(mapId);
		if (id == null)
		{
			return false;
		}

		Document update = new Document("settings", settings).append("world", world).append("lastAccessedAt", new Date());
		if (maps.updateOne(Filters.eq("_id", id), new Document("$set", update)).getMatchedCount() == 0)
		{
			return false;
		}

		if (image != null && image.length > 0)
		{
			Document imageDoc = new Document("contentType", contentType).append("data", image).append("updatedAt", new Date());
			images.updateOne(Filters.eq("_id", id), new Document("$set", imageDoc), new com.mongodb.client.model.UpdateOptions().upsert(true));
		}
		Logger.println("Updated stored map " + id.toHexString() + " (" + (image == null ? 0 : image.length) + " image bytes)");
		return true;
	}

	/** Returns one stored world, or null when the id names nothing this store holds. Reading also counts as use for retention. */
	public StoredMap find(String mapId)
	{
		ObjectId id = parseId(mapId);
		if (id == null)
		{
			return null;
		}

		Document doc = maps.find(Filters.eq("_id", id)).first();
		if (doc == null)
		{
			return null;
		}
		maps.updateOne(Filters.eq("_id", id), Updates.set("lastAccessedAt", new Date()));

		return new StoredMap(id.toHexString(), longValue(doc.get("seed")), (Document) doc.get("settings"), (Document) doc.get("world"), (Date) doc.get("createdAt"));
	}

	/** Returns the rendered image of one stored world, or null when it has none. */
	public StoredImage findImage(String mapId)
	{
		ObjectId id = parseId(mapId);
		if (id == null)
		{
			return null;
		}

		Document doc = images.find(Filters.eq("_id", id)).first();
		if (doc == null)
		{
			return null;
		}
		// MongoDB stores binary fields as Binary, not byte[]; anything else is not an image this store wrote.
		if (!(doc.get("data") instanceof Binary binary))
		{
			return null;
		}
		byte[] data = binary.getData();
		if (data.length == 0)
		{
			return null;
		}
		String contentType = trimToNull(doc.getString("contentType"));
		return new StoredImage(contentType == null ? "image/jpeg" : contentType, data);
	}

	/** Removes a stored world and its image. Returns false when the map was already gone. */
	public boolean delete(String mapId)
	{
		ObjectId id = parseId(mapId);
		if (id == null)
		{
			return false;
		}
		images.deleteOne(Filters.eq("_id", id));
		return maps.deleteOne(Filters.eq("_id", id)).getDeletedCount() > 0;
	}

	/** Converts a JSON document to the shape the driver stores, so callers keep passing the maps they already build. */
	public Document toDocument(Map<String, Object> value)
	{
		return Document.parse(gson.toJson(value));
	}

	@Override
	public void close()
	{
		client.close();
	}

	private static ObjectId parseId(String mapId)
	{
		String trimmed = trimToNull(mapId);
		if (trimmed == null || !ObjectId.isValid(trimmed))
		{
			return null;
		}
		return new ObjectId(trimmed);
	}

	private static long longValue(Object value)
	{
		return value instanceof Number number ? number.longValue() : 0L;
	}

	private static String trimToNull(String value)
	{
		if (value == null)
		{
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	/** One stored world as it was generated: the settings that produce it, and the description a client reads. */
	public static final class StoredMap
	{
		public final String id;
		public final long seed;
		public final Document settings;
		public final Document world;
		public final Date createdAt;

		StoredMap(String id, long seed, Document settings, Document world, Date createdAt)
		{
			this.id = id;
			this.seed = seed;
			this.settings = settings;
			this.world = world;
			this.createdAt = createdAt;
		}
	}

	/** The rendered image of a stored world. */
	public static final class StoredImage
	{
		public final String contentType;
		public final byte[] data;

		StoredImage(String contentType, byte[] data)
		{
			this.contentType = contentType;
			this.data = data;
		}
	}
}

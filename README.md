# Vellaris — Procedural Fantasy Map Service

A fantasy map generator that runs as a web service. A Java HTTP API simulates tectonic plates to produce
islands and continents with terrain features (trees, rivers, mountains) rendered in an old-fashioned,
hand-drawn style. A React frontend consumes the API.

There is no desktop application in this repository.

**Tech Stack**
- **Language:** Java 25 or newer
- **Build:** Gradle (use the included Gradle wrapper)
- **Server:** Javalin/Jetty HTTP API, headless AWT rendering
- **Tests:** JUnit 5
- **Frontend:** React + Vite in `web/`

**Repository Layout (high level)**
- `src/` — Java sources: map generation, rendering, and the HTTP API.
- `web/` — React + Vite frontend.
- `docker/` — nginx config and container entrypoint.
- `gradlew`, `gradlew.bat` — Gradle wrapper scripts for cross-platform builds.
- `eclipse-formatter-config.xml` — Formatter used by the project.

Developer Quickstart
--------------------

Prerequisites
- Install a Java 25+ JDK and make sure `java`/`javac` are on your PATH.
- Install Node.js (recommended: Node 18 LTS or newer) and `npm` or `pnpm`.
- Use the bundled Gradle wrapper (`./gradlew`)—no system Gradle required.

Verify installations:

```bash
java -version
node -v
./gradlew -v
```

Build and run the API server

1. Build the self-contained server jar:

```bash
./gradlew jar
```

2. Run it (headless; listens on port 8080):

```bash
java -jar build/libs/VellarisServer.jar
```

3. Run the test suite:

```bash
./gradlew test
```

Notes on tests: Some rendering tests are slow and rely on pixel comparisons; run them selectively when needed.

HTTP API
- `GET /api/health` — liveness probe.
- `GET /api/ui-options` — translation strings, icon sets, art packs, fonts, dimensions.

The routes below take a settings body in either of two shapes. A **short** document names only the choices the generator
panel offers — `dimension` (`Square`, `Sixteen_by_9`, `Golden_Ratio`), `worldSize`, `landShape`, `regionCount`,
`cityProbability`, `artPack`, `cityIconSetName`, `books`, `language` — plus the rendering choices the generator would
otherwise make at random: `drawRegionBoundaries`, `drawRegionColors`, `drawBorder`, `frayedBorder`, `coastShadingLevel`,
`coastlineWidth`, `lineStyle`, `drawGridOverlay`, `gridOverlayShape`, `gridOverlayRowOrColCount`,
`gridOverlayLineWidth`, `gridOverlayLayer` and `drawVoronoiGridOverlayOnlyOnLand`. Anything it leaves out is invented.
Add `generatedWidth` and/or `generatedHeight` to pin the picture size in pixels: the named dimension sets the shape
(16:9 is 4096 wide), and these override it, which is how a caller renders a map bigger than the presets for a screen
that will zoom into it. One side alone keeps the dimension's aspect ratio; sizes are clamped to 256–16384 per side.
It describes a kind of map: `/api/generate`, `/api/generate-settings`, `/api/world` and `/api/world/map` invent the full
settings around it (add `randomSeed` to pin which world comes out). A **full** document is the canonical settings those
routes answer with, and it is what `/api/route`, `/api/nearest` and `/api/world/places` need, because they must name the
one world the caller means.

- `POST /api/generate-settings` — returns a fresh random `MapSettings` JSON document.
- `POST /api/generate` — renders a map from a `MapSettings` body and returns JSON with a base64 JPEG.
- `POST /api/world` — generates a map from a `MapSettings` body and returns a compact description of the world
  (named places, regions with their names and colors, roads) plus the canonical settings, without encoding an image.
  Coordinates are resolution-invariant, so the same world describes the same locations at any render resolution.
  A place's `x`/`y` is where the map draws it: the centre of its pictogram when it has one, and its label when it has
  none. A marker saying "the party is here" therefore lands on the town rather than on the word beside it, and scenery
  icons (trees, hills, mountains, dunes) are never mistaken for a place's drawing.
  Pass `?includeImage=true` to also get the rendered map as `imageBase64`; that image is identical to the one
  `/api/generate` returns for the same settings, and generating both in one call avoids rendering the world twice.
- `POST /api/world/map` — generates a map from a `MapSettings` body and returns the raw JPEG as `image/jpeg`. This is the
  map you show to players, so it is **not** downscaled: you get the size the render produced. Pass `?maxDimension=N` to
  request a smaller copy, and `?quality=1..100` (default 92) to trade fidelity for size. `/api/world?includeImage=true`
  and `/api/generate` return base64, which does not compress, so those default to a 1920px preview; raise it with
  `?maxDimension=N` or use this route for the full map.
- `POST /api/route` — takes a `MapSettings` body plus `from` and `to` (each either `{"name":"..."}` or `{"x":..,"y":..}`)
  and returns the route between them: distance, terrain travelled through, travel time, the regions crossed, the
  named places near the route in the order they are reached, and waypoints. `mode` may be `walk` (default) or
  `horse`. Water is impassable unless `allowWater` is true, so a destination on another landmass reports
  `reachable: false` rather than inventing a route. Because the map has no inherent physical scale, `travel.days`
  assumes `mapUnitsPerDay` of open ground per day; override it to match your world, and read `travel.assumptions`
  to see what was used.
- `POST /api/nearest` — takes a `MapSettings` body plus `x` and `y`, and returns the nearest named place, the region
  containing that point, and a stable `anchor` string for the surrounding area. Anchors are coarse cells, intended as
  the key under which a client stores its own per-location notes; this server stores nothing about them.
- `POST /api/background-base` — returns a background texture JPEG.
- `POST /api/world/places` — takes a `MapSettings` body plus a `places` array of `{"name", "x", "y"}` entries and
  marks each one on the world: a `Landmark` label with a cross marker above it. The world is rendered again from the same
  seeds, so nothing already on the map moves. Answers with the updated `world`, the canonical `settings` to keep, the
  `added` names and the re-rendered map as `imageBase64`. Names already on the map are skipped; a point more than 120
  pixels from land is refused rather than labelling open water, and a point near a coast is snapped onto it.

## Stored maps (optional)

By default the service is stateless: every answer carries the world and the settings that produced it. A deployment
that sets `VELLARIS_MONGO_URI` can also keep generated maps and hand out an id for them, so a client no longer has to
store a megabyte of settings per map or send them back for every route query.

| Variable | Meaning |
| --- | --- |
| `VELLARIS_MONGO_URI` | MongoDB connection string. Unset keeps the service stateless. |
| `VELLARIS_MONGO_DB` | Database name; defaults to `vellaris` when the connection string does not name one. |
| `VELLARIS_API_TOKEN` | Optional shared secret. When set, every `/api/maps/*` call must send `X-Vellaris-Token`. |
| `VELLARIS_MAP_TTL_SECONDS` | Optional retention: maps expire this long after their last read. Zero or unset keeps them. |

Stored routes:
- `POST /api/world?persist=true` — same answer as `/api/world`, plus `mapId`. The world description, its canonical
  settings and the rendered image are stored under that id. Requires a database and, when configured, the token.
- `GET /api/maps/{id}` — the stored world description and canonical settings, plus `seed` and `createdAt`.
- `GET /api/maps/{id}/map` — the stored image, byte-for-byte as generated.
- `POST /api/maps/{id}/route` — same body as `/api/route` minus the settings, because the stored ones are used.
- `POST /api/maps/{id}/places` — same `places` body as `/api/world/places`, marked on a stored world. The stored
  description, settings and image are replaced under the **same id**, so the image and route lookups a client already
  makes pick up the new render; answers with the updated `world` and the `added` names. Requires the token when one is
  configured.
- `DELETE /api/maps/{id}` — removes the world and its image; idempotent, answering `success:false` when already gone.

The stored records are two collections: `maps` (settings, world, timestamps) and `map_images` (the JPEG), so a large
image can never push the description past MongoDB's document limit.

### Checking that a map was stored

Every persisted generation logs the id it was given:

```bash
docker compose pull vellaris     # compose reuses a local `latest`; pull to get the log line
docker compose up -d
docker compose logs vellaris | grep "Stored map"
# Stored map 6af3c182c19885d0202e524b (seed 1827671559, 2393168 image bytes)
```

Read the map back through the API (send `X-Vellaris-Token` when `VELLARIS_API_TOKEN` is set):

```bash
curl -s "http://localhost:8080/api/maps/<id>" -H "X-Vellaris-Token: $VELLARIS_API_TOKEN" | head -c 200
curl -s -o /tmp/map.jpg -w '%{http_code} %{content_type} %{size_download}\n' \
  "http://localhost:8080/api/maps/<id>/map" -H "X-Vellaris-Token: $VELLARIS_API_TOKEN"
```

Or ask the database directly:

```bash
docker compose exec mongo mongosh -u vellaris -p "<password>" --authenticationDatabase admin vellaris --quiet \
  --eval 'print("maps:", db.maps.countDocuments()); print("images:", db.map_images.countDocuments())'
```

`db.maps.find({}, {settings: 0, world: 0}).sort({createdAt: -1}).limit(5)` lists recent ids without the megabyte of
settings. The game points at its map with `campaignSpec.vellarisMapId`; when that field is absent the campaign was
generated statelessly because the service refused persistence, and the game server's log names the reason:

```bash
docker compose exec mongo mongosh -u vellaris -p "<password>" --authenticationDatabase admin vellaris --quiet \
  --eval 'db.gamestates.find({}, {gameId: 1, "campaignSpec.vellarisMapId": 1}).limit(5)'
```

That last query needs the game server to use the same database (`DM_MONGODB_URI`); it logs `campaign world: stored map
<id> for game <id>` at the moment it records the link.

## Docker Compose (service + database)

`docker-compose.yml` runs the map service and the MongoDB it stores maps in, on one network.

### Get the files without cloning

The stack is two files. Download them straight from the repository's `main` branch — no `git clone` needed:

```bash
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/kabroxiko/Vellaris/main/docker-compose.yml
curl -fsSL --create-dirs -o docker/.env.example https://raw.githubusercontent.com/kabroxiko/Vellaris/main/docker/.env.example
```

A whole tree as a snapshot is also fine when you do not want Git history:

```bash
curl -fsSL https://github.com/kabroxiko/Vellaris/archive/refs/heads/main.tar.gz | tar -xz --strip-components=1
```

From the web UI, open each file, press **Raw**, and save it under the same relative path (`docker-compose.yml` and
`docker/.env.example`).

Then start the stack:

```bash
cp docker/.env.example .env       # password, shared token, port
docker compose up -d
docker compose logs -f vellaris   # "Map persistence is configured", then Javalin's listening line
```

The service reaches Mongo as `mongo:27017` over the compose network. A URI with `localhost` would point at the
container itself and fail with `Connection refused`, which is the usual symptom of running the two containers with
`docker run` instead of a shared network.

The DungeonMaster API stays outside this stack (it runs from its own repository on the host). Point it at the
published port and the shared secret:

```dotenv
DM_MONGODB_URI=mongodb://vellaris:<password>@127.0.0.1:27017/vellaris?authSource=admin
DM_VELLARIS_URL=http://127.0.0.1:8080
DM_VELLARIS_TOKEN=<same value as VELLARIS_API_TOKEN>
```

### Moving an existing database

A fresh volume starts empty. If Mongo was previously run with `docker run`, reuse its volume rather than starting
over:

```bash
docker inspect mongodb --format '{{range .Mounts}}{{.Name}} {{end}}'   # note the volume name
# add it to .env as MONGO_DATA_VOLUME=<name>
docker rm -f mongodb vellaris
docker compose up -d
```

If the old container used a volume you do not want to reuse, copy the data with `mongodump`/`mongorestore` before
removing it; the README of the game server covers the same database.

### If `mongo` does not resolve

`UnknownHostException: mongo: Name or service not known` means the database container is not on this stack's network,
so there is no `mongo` host for the service to reach. Check in this order:

```bash
docker compose ps -a          # is mongo Up/healthy, or Created/Exited?
docker compose logs mongo     # port 27017 already allocated, permissions, failed init
docker ps -a | grep 27017     # an old `docker run` Mongo still holding the port
```

The usual cause is a Mongo container left over from `docker run`: it still publishes 27017, so the compose `mongo`
service cannot start, never joins the network, and its name never resolves. Note the old volume first (see above), then
replace the containers:

```bash
docker compose down
docker rm -f mongodb vellaris
docker compose up -d
docker compose ps
```

## Map raster size

The pixel size of a rendered map is set by `generatedWidth` / `generatedHeight` in the settings, which act as a bounding
box: the map is rendered to fit inside it while preserving its aspect ratio, so a 1600x900 box produces roughly
1525x899 of actual map. `resolution` scales the same result, but when a box is supplied the renderer lowers the
resolution to fit the box, so raising `resolution` alone will not make the image larger — raise the box instead.

With a 4096x2304 box the service returns a 4015x2302 image, which is about 2.4 MB as JPEG at the default quality of 92
(3.2 MB at 95, 1.7 MB at 85). Images are encoded as JPEG: there is no PNG output. JPEG has no alpha channel, so any
transparency is flattened onto white before encoding, which only matters if a map is rendered with a see-through edge.
A `maxDimension` of around 1920-2560 is a reasonable target for a player-facing map.

## Answering queries without keeping the world

`/api/route` and `/api/nearest` need the generated graph and the place names, and the names are only
produced while drawing text. The service therefore answers them from the settings the caller sends,
not from anything it remembers:

1. Call `/api/world` once. It renders the map, invents the names, and returns them under `settings`.
2. Keep that `settings` object and send it back with every `/api/route` and `/api/nearest` request,
   alongside `from` and `to` (or `x` and `y`).

Because those settings already carry the generated names, the service rebuilds only the graph and
skips the render entirely. Nothing is cached server-side, so there is no cache to size, no eviction,
and no per-world memory held between requests — the caller owns the world.

A request whose settings carry no names yet (a raw world from `/api/generate-settings`) still gets a
full render first, because there are no names to resolve against.

Measured on a 4096x2304 world:

| request | time |
|---|---|
| `/api/world` (renders, invents names) | 7-9 s |
| `/api/route` with the returned `settings`, first call | 1.8 s |
| `/api/route` with the returned `settings`, warm | 0.55 s |
| `/api/route` without names (falls back to a render) | 3.3-7.4 s |

The rebuild marks mountains and hills itself, because the renderer marks them while placing icons and
a graph that was never drawn has none. Terrain cost depends on those marks, so without them a route
came out 1.8% longer than the same route in the rendered world. It marks slightly more than the
renderer keeps — the renderer also clears the flag where a mountain icon could not be drawn — so a
rebuilt graph can treat a handful of extra centres as mountainous.

## Docker

The `Dockerfile` builds the frontend with Vite, builds the server jar with Gradle, and assembles a runtime
image with nginx in front of the Java process:

```bash
docker build -t vellaris .
docker run -p 8081:8081 vellaris
```

Web frontend (development)

1. Enter the frontend folder and install dependencies:

```bash
cd web
npm install
```

2. Start the local dev server (hot reload):

```bash
npm run dev
```

3. Build a production bundle:

```bash
npm run build
```

Formatting and linting
- The project uses an Eclipse formatter configuration at [eclipse-formatter-config.xml](eclipse-formatter-config.xml).
- Formatting may be enforced via Spotless/Gradle—use the Gradle tasks when available:

```bash
./gradlew spotlessApply
./gradlew spotlessCheck
```

- JavaScript linting is configured in `web/` via ESLint; run it from the `web/` folder:

```bash
cd web
npm run lint
```

Benchmarking and performance
- A benchmark task is provided for profiling generation performance. Use the Gradle benchmark task and open the produced profile with Java Flight Recorder tools if needed:

```bash
./gradlew benchmark
```

Development workflow recommendations
- Use IntelliJ IDEA (or Eclipse) and enable import of Gradle settings.
- Configure the IDE to use the provided `eclipse-formatter-config.xml` to keep formatting consistent.
- Prefer the Gradle wrapper (`./gradlew`) for all CI and developer tasks.

Common tasks summary
- Build server jar: `./gradlew jar`
- Run server: `java -jar build/libs/VellarisServer.jar`
- Run tests: `./gradlew test`
- Format code: `./gradlew spotlessApply`
- Web dev server: `cd web && npm run dev`

Contributing
- Create focused feature branches and open pull requests.
- Run tests and linting locally before submitting changes.
- Keep commits small and descriptive; follow the repository's existing commit style.

Where to look next
- HTTP API: `src/nortantis/api/MapApiServer.java`
- Map generation pipeline: `src/nortantis/MapCreator.java`
- Frontend: `web/src/`
- Formatter config: [eclipse-formatter-config.xml](eclipse-formatter-config.xml)

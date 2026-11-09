# Vellaris — Procedural Fantasy Map Service

A fantasy map generator that runs as a web service. A Java HTTP API simulates tectonic plates to produce
islands and continents with terrain features (trees, rivers, mountains) rendered in an old-fashioned,
hand-drawn style. A React frontend consumes the API.

There is no desktop application in this repository.

**Tech Stack**
- **Language:** Java 21 or newer
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
- Install a Java 21+ JDK and make sure `java`/`javac` are on your PATH.
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
- `POST /api/generate-settings` — returns a fresh random `MapSettings` JSON document.
- `POST /api/generate` — renders a map from a `MapSettings` body and returns JSON with a base64 JPEG.
- `POST /api/world` — generates a map from a `MapSettings` body and returns a compact description of the world
  (named places, regions with their names and colors, roads) plus the canonical settings, without encoding an image.
  Coordinates are resolution-invariant, so the same world describes the same locations at any render resolution.
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
  the key under which a client stores its own per-location notes; this server stores nothing.
- `POST /api/background-base` — returns a background texture JPEG.

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

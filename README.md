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
- `POST /api/generate` — renders a map from a `MapSettings` body and returns JSON with a base64 PNG.
- `POST /api/world` — generates a map from a `MapSettings` body and returns a compact description of the world
  (named places, regions with their names and colors, roads) plus the canonical settings, without encoding an image.
  Coordinates are resolution-invariant, so the same world describes the same locations at any render resolution.
  Pass `?includeImage=true` to also get the rendered map as `imageBase64`; that PNG is identical to the one
  `/api/generate` returns for the same settings, and generating both in one call avoids rendering the world twice.
- `POST /api/world/map` — generates a map from a `MapSettings` body and returns the raw PNG as `image/png`. The bytes
  are identical to the ones carried by `/api/generate` and `/api/world?includeImage=true`, but without the base64
  overhead.
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
- `POST /api/background-base` — returns a background texture PNG.

Docker

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

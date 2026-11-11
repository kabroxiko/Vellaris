# Vellaris

Fantasy map generator that uses tectonic plate simulation to create islands and continents with terrain features (trees, rivers, mountains) rendered with an old-fashioned, hand-drawn appearance. This build runs as a web service: a Java HTTP API generates maps and a React frontend consumes it.

## Tech Stack

- **Language:** Java 25+
- **Build System:** Gradle (use `gradlew` wrapper)
- **Server:** Javalin/Jetty HTTP API (headless)
- **Graphics:** AWT (CPU-based rendering, `-Djava.awt.headless=true`)
- **Frontend:** React + Vite in `web/`
- **Testing:** JUnit 5

There is no desktop UI. Do not add `javax.swing` or `com.formdev` dependencies, and do not reintroduce a GUI main class.

## Shell and Paths

The shell is Windows bash (Git Bash / MSYS2). Use Windows-style paths like `C:/Users/...`, not WSL-style `/mnt/c/...` paths — the latter do not exist in this environment.

## Build and Run

```bash
# Build the server jar (API + map generation)
./gradlew jar

# Run the API server headlessly
java -jar build/libs/VellarisServer.jar

# Run tests
./gradlew test

# Run benchmark with JFR profiling
./gradlew benchmark
```

The server listens on port 8080. The React frontend in `web/` is built separately with Vite and talks to
`/api/*`. In production, nginx serves the static build and proxies to the Java process (see `Dockerfile`
and `docker/nginx.conf`).

## Project Structure

```
src/nortantis/
├── MapCreator.java          # Core map generation orchestrator
├── MapSettings.java         # Serializable map configuration
├── WorldGraph.java          # Voronoi graph with elevation/biome data
├── GraphCreator.java        # Constructs WorldGraph from Voronoi diagrams
├── api/                     # Javalin HTTP API (MapApiServer)
├── i18n/                    # Translation class and messages*.properties bundles
├── platform/                # Graphics abstraction layer
│   ├── PlatformFactory.java # Factory for graphics backends
│   ├── Image.java           # Abstract image
│   ├── Painter.java         # Abstract drawing interface
│   └── awt/                 # AWT rendering implementation
├── editor/                  # Map editing data structures (MapEdits, UserPreferences, UpdateType)
├── graph/voronoi/           # Voronoi diagram structures
├── geom/                    # Geometry utilities
└── util/                    # General utilities
```

## Key Entry Points

- **Server Entry:** `nortantis.api.MapApiServer`
- **Map Generation:** `nortantis.MapCreator.createMap()
- **Settings:** `nortantis.MapSettings` - serialized as `.nort` files

## Architecture Patterns

### Platform Abstraction (Strategy Pattern)
```java
// The server uses AWT rendering in headless mode:
PlatformFactory.setInstance(new AwtFactory());
```

The platform abstraction layer allows different rendering backends. The Skia backend has been moved to the Android project.

### Resource Management
`Image` and `Painter` implement `AutoCloseable`. Always use try-with-resources for Painters:
```java
try (Painter p = image.createPainter()) {
    // drawing operations
}
```
Use try-with-resources for Image whenever feasible.

## Testing

Important tests:
- `ImageHelperTest` - Test ImageHelper operations
- `ConcurrentGraphCreationTest` - Builds graphs from one seed on several threads and requires identical results. Fast, and it catches process-wide mutable state leaking between generations.

`MapCreatorTest` is disabled (it is checked in as `MapCreatorTest.java.bak`). Its expected-output data is still in `unit test files/expected maps/`.

My unit tests can be overly strict sometimes because they compare pixel-by-pixel. If the output images look close enough that a person wouldn't be able to easily tell the difference, then that's probably good enough, as long as the test is consistent in the results it gives.

Test data locations:
- Map settings: `unit test files/map settings/`
- Expected outputs:
	`unit test files/expected maps/` for MapCreatorTest
	`unit test files/expected image helper tests` for ImageHelperTest

## Performance Benchmarking

Use the benchmark task to profile map creation performance:

```bash
./gradlew benchmark
```

This runs `AwtMapCreatorBenchmark` with JFR (Java Flight Recorder) profiling enabled. The JFR recording is saved to `build/profile.jfr`.

**Analyzing results:**
- Open `build/profile.jfr` in JDK Mission Control (`jmc`) or IntelliJ IDEA
- Look at "Hot Methods" or "Method Profiling" to find CPU hotspots
- Use the Call Tree view to see time spent in each method

**When working on performance:**
1. Run `./gradlew benchmark` to establish a baseline
2. Make changes
3. Run benchmark again to measure improvement
4. Use JFR profile to identify remaining hotspots

The benchmark creates maps using settings from `unit test files/map settings/simpleSmallWorld.nort`.

**Measuring honestly:** run-to-run variance on this benchmark is 15-20%, and it is much worse when
other JVMs are running (SonarLint, the Java language server) - a load average above ~5 makes
single-run before/after comparisons meaningless. Compare interleaved runs (A, B, A, B, A, B) rather
than running all of A then all of B, and prefer load-independent metrics where they exist (thread
counts, JFR sample counts) over wall-clock deltas.

## Editing Files

Whenever possible, use the Read, Edit, and Write tools to read and modify files. Try to never use Python scripts, shell commands like `sed` or `awk`, or PowerShell to read or write file content.

## Coding Conventions

- **Formatting:** Eclipse formatter config in `eclipse-formatter-config.xml`, enforced by Spotless
- **Naming:** PascalCase for classes, camelCase for methods/variables
- **Abbreviations:** Use full words in variable and method names. Single-letter names are fine when used consistently in the existing code (e.g. `p` for Point or Painter, `c` for Center, `e` for a map entry). Established acronyms are fine (e.g. `RI` for resolution-invariant). Do not use partial-word abbreviations that drop vowels or truncate words (e.g. write `samplePoints` not `samplePts`, `selectionBounds` not `selBounds`, `originalCenter` not `origCenter`). Do not use opaque prefixed names where the prefix is not self-evident (e.g. avoid `sIsWater`, `oe`, `sRegionId`).
- **Custom Functional Interfaces:** `Function<T, R>`, `Function0<R>`, `Function2<T1, T2, R>`
- **Tuple Classes:** `Tuple2`, `Tuple3`, `Tuple4`, `Pair`, `OrderlessPair`
- **Helper class for timing:** nortantis.util.Stopwatch
- **Rectangle and dimension classes:** Use `nortantis.geom.Rectangle`, `IntRectangle`, `RotatedRectangle`, `Dimension`, and `IntDimension` for anything bounding-box or size related. These classes have methods for intersection, union, containment checks, `fromCorners`, etc. Prefer these over recreating bounding-box logic inline.
- **Translations:** Whenever you add or modify a string key accessed via `Translation.get(...)`, update the English file (`messages.properties`) and all language files (`messages_de.properties`, `messages_es.properties`, `messages_fr.properties`, `messages_pt.properties`, `messages_ru.properties`, `messages_zh.properties`) in `src/nortantis/i18n/`.

## Map Generation Pipeline

For "full" draws:

```
MapSettings (.nort file)
  ↓
MapCreator.createMap()
  ├─ GraphCreator.createGraph() → WorldGraph (Voronoi + elevation)
  ├─ drawTerrain() → Land, water, coasts
  ├─ drawRivers() → Rivers and lakes
  ├─ drawMountains() → Mountain textures
  ├─ drawIcons() → City/landmark icons
  ├─ drawText() → Place/region names
  └─ drawBorders() → Political boundaries
  ↓
Image (final rendered map)
```

Every request renders the whole map. The incremental drawing methods (`incrementalUpdateText`,
`incrementalUpdateIcons`, `incrementalUpdateForCentersAndEdges`) were removed along with the desktop editor that
was their only caller, so `createMap` is the single rendering entry point.


## Key Algorithms

- **Tectonic Plates:** Random plate generation with collision-based elevation
- **Voronoi Diagrams:** Fortune's Algorithm with Lloyd Relaxation
- **Rivers:** Flow from high to low elevation along Voronoi edges
- **Names:** N-gram generation from classic literature (`assets/books/`)

## Android / Skia

The Skia rendering backend lives in the separate Android project (`NortantisTest`), which depends on this
repository's JAR. See the Android project's CLAUDE.md for details.

If you discover anything to be incorrect in these instructions, please update them in CLAUDE.md.

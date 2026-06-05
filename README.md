# Map Generator & Editor — Overview and Developer Quickstart

A desktop-first map generator and editor with an optional web UI for auxiliary tools. This repository contains:

- A Java-based core application (GUI + rendering) built with Gradle and Swing/AWT.
- A small web frontend for developer tooling and previews (in the `web/` folder).

This README covers what the project does, key components, and a concise developer quickstart (Java, Gradle, Node, and environment setup).

**Highlights**
- **Purpose:** Generate and edit procedurally created maps with layered terrain, rivers, and stylized rendering.
- **Desktop GUI:** Native Java Swing/AWT application for map creation and editing.
- **Extensible:** Modular pipeline (graph creation, elevation, rivers, rendering) so features can be swapped or extended.
- **Tooling:** Gradle wrapper for builds and tasks; Node-based web tools for previews and developer utilities.

**Tech Stack**
- **Language:** Java 21 or newer
- **Build:** Gradle (use the included Gradle wrapper)
- **UI / Rendering:** Swing + AWT
- **Tests:** JUnit 5
- **Web tools:** Node (local dev server, bundler) in `web/`

**Repository Layout (high level)**
- `src/` — Main Java sources and tests.
- `web/` — Node + Vite development frontend for tooling and previews.
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

Run the desktop application (development)

1. From the repository root, run the Gradle run task which launches the GUI application:

```bash
./gradlew run
```

2. Build an executable JAR:

```bash
./gradlew jar
```

3. Run the test suite:

```bash
./gradlew test
```

Notes on tests: Some UI/rendering tests are slow and rely on pixel comparisons; run them selectively when needed.

Web tools (preview / developer UI)

1. Enter the web tool folder and install dependencies:

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
- Run app: `./gradlew run`
- Build JAR: `./gradlew jar`
- Run tests: `./gradlew test`
- Format code: `./gradlew spotlessApply`
- Web dev server: `cd web && npm run dev`

Contributing
- Create focused feature branches and open pull requests.
- Run tests and linting locally before submitting changes.
- Keep commits small and descriptive; follow the repository's existing commit style.

Where to look next
- Java entry point and GUI: `src/` (core application sources)
- Web tooling and package config: `web/package.json`
- Formatter config: [eclipse-formatter-config.xml](eclipse-formatter-config.xml)

Questions or changes
- If you want the README to include example screenshots, CI instructions, or packaging steps for macOS or Windows installers, tell me which platform(s) to target and I will add them.

---
Updated README written to provide a clear dev-first quickstart and overview. If you'd like more detail in any section, specify which area to expand.

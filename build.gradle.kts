plugins {
    java
    application
    `java-test-fixtures`
    id("com.diffplug.spotless") version "8.6.0"
    id("com.github.ben-manes.versions") version "0.54.0"
    jacoco
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.github.wendykierp:JTransforms:3.2:with-dependencies")
    implementation("io.javalin:javalin:7.2.2")
    implementation("org.apache.commons:commons-lang3:3.20.0")
    implementation("commons-io:commons-io:2.22.0")
    implementation("org.apache.commons:commons-math3:3.6.1")
    implementation("com.googlecode.json-simple:json-simple:1.1.1")
    implementation("org.imgscalr:imgscalr-lib:4.2")
    implementation("org.slf4j:slf4j-simple:2.0.18")
    implementation("com.google.code.gson:gson:2.14.0")
    implementation("org.mongodb:mongodb-driver-sync:5.14.0")
    testImplementation(platform("org.junit:junit-bom:6.1.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    mainClass.set("nortantis.api.MapApiServer")
    applicationDefaultJvmArgs = listOf(
        "-Djava.awt.headless=true",
        "--enable-native-access=ALL-UNNAMED",
    )
}

java {
    sourceCompatibility = JavaVersion.VERSION_25
    targetCompatibility = JavaVersion.VERSION_25
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:deprecation", "-Xlint:unchecked"))
}

tasks.jar {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    manifest {
        attributes("Main-Class" to "nortantis.api.MapApiServer")
    }
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) }) {
        exclude("META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA")
    }
    from(sourceSets.main.get().output) {
        from("assets") {
            into("assets")
        }
    }
    archiveFileName.set("VellarisServer.jar")
}

tasks.test {
    jvmArgs = listOf(
        "-ea", "--enable-native-access=ALL-UNNAMED", "-Dfile.encoding=UTF-8", "-Dsun.java2d.d3d=false", "-Xmx3g",
        "-Djava.awt.headless=true",
        "--add-opens", "java.base/java.nio=ALL-UNNAMED",
    )
    useJUnitPlatform()
    filter {
        excludeTestsMatching("nortantis.test.AwtMapCreatorBenchmark")
        excludeTestsMatching("nortantis.test.ImageHelperBenchmark")
    }
}

// Benchmark task with JFR profiling
// Usage: ./gradlew benchmark
// Output: build/profile.jfr (open in JDK Mission Control or IntelliJ)
tasks.register<Test>("benchmark") {
    description = "Run benchmarks with JFR profiling"
    group = "verification"

    // Use the test source set
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath

    useJUnitPlatform()
    forkEvery = 1

    // Only run benchmark tests
    filter {
        includeTestsMatching("nortantis.test.AwtMapCreatorBenchmark")
    }

    jvmArgs = listOf(
        "-ea",
        "--enable-native-access=ALL-UNNAMED",
        "-Dfile.encoding=UTF-8",
        "-Dsun.java2d.d3d=false",
        "-Djava.awt.headless=true",
        "-Xmx4g",
        "--add-opens", "java.base/java.nio=ALL-UNNAMED",
        // JFR profiling - records to build/profile.jfr
        "-XX:StartFlightRecording=filename=build/profile.jfr,settings=profile",
    )

    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }

    doFirst {
        println("Starting benchmark with JFR profiling...")
        println("JFR output will be saved to: build/profile.jfr")
    }

    doLast {
        println("\nBenchmark complete!")
        println("Open build/profile.jfr in JDK Mission Control or IntelliJ to analyze.")
    }
}

sourceSets {
    main {
        java {
            setSrcDirs(listOf("src"))
            include("**/*.java")
        }
        resources {
            setSrcDirs(listOf("src"))
            include("**/*.properties", "**/manifest.txt")
        }
    }
    test {
        java {
            setSrcDirs(listOf("test"))
            include("**/*.java")
        }
    }
}

// Generate an asset manifest listing all files under assets/ so that code
// running from a JAR or on Android can enumerate assets without JAR introspection.
tasks.register("generateAssetManifest") {
    val assetsDir = file("assets")
    val outputDir = file("${layout.buildDirectory.get()}/generated-resources/assets")
    val manifestFile = File(outputDir, "manifest.txt")

    inputs.dir(assetsDir)
    outputs.file(manifestFile)

    doLast {
        outputDir.mkdirs()
        val lines = mutableListOf<String>()
        assetsDir.walkTopDown().forEach { f ->
            if (f == assetsDir) return@forEach
            val relative = assetsDir.toPath().relativize(f.toPath()).toString().replace('\\', '/')
            val prefix = "assets/$relative"
            if (f.isDirectory) {
                lines.add("$prefix/\tD")
            } else {
                lines.add("$prefix\tF")
            }
        }
        lines.sort()
        manifestFile.writeText(lines.joinToString("\n") + "\n")
    }
}

sourceSets.main.get().resources.srcDirs("${layout.buildDirectory.get()}/generated-resources")
tasks.processResources { dependsOn("generateAssetManifest") }

spotless {
    java {
        eclipse().configFile("eclipse-formatter-config.xml")
        cleanthat()
    }
}

jacoco {
    // 0.8.10 is the release Gradle bundles, and it cannot read Java 25 class files: the agent throws "Unsupported
    // class file major version 69" for every class the JVM loads, so coverage comes out empty.
    toolVersion = "0.8.16"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }
}

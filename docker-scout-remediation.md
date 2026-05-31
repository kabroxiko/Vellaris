Docker Scout remediation suggestions

Summary
- Target: fs://. (repository filesystem)
- Detected: 17 vulnerable packages, 75 total CVEs (3 Critical, 28 High, 44 Medium, 5 Low)

Top vulnerable families detected and suggested remediation:

1) Go standard library (pkg:golang/stdlib@1.20.12)
- Issue: multiple critical/high CVEs affecting Go stdlib versions < listed fixes.
- Cause: SBOM indicates Go stdlib version present (likely in Docker images or vendored tooling).
- Recommendation: identify any Dockerfiles or built images that include Go toolchain. Rebuild images using a patched Go version (>= fixed version in each CVE). If no images use Go, document and ignore.
- Commands to check images and local SBOMs:

  docker scout quickview fs://.
  docker scout cves fs://.

- If you build Docker images locally, rebuild base images with updated Go (example):

  # update Dockerfile FROM image that ships newer Go (example)
  FROM golang:1.25.10

  # rebuild
  docker build -t nortantis:patched .

2) SnakeYAML (`org.yaml:snakeyaml`)
- Detected: `org.yaml:snakeyaml` 1.31 with CVEs (CVE-2022-1471, etc.). Recommended upgrade: 2.0+.
- Remediation options:
  - Prefer: upgrade to `org.yaml:snakeyaml:2.0` and migrate to the SafeConstructor APIs where parsing untrusted YAML occurs.
  - If transitive dependency: add an explicit forced version in Gradle (non-destructive):

    configurations.all {
      resolutionStrategy {
        force("org.yaml:snakeyaml:2.0")
      }
    }

3) Jackson (`com.fasterxml.jackson.core:jackson-core` / `jackson-databind`)
- Detected: `jackson-core` 2.13.5 with HIGH CVE; recommended minimum: 2.15.0+.
- Remediation: force safer versions via Gradle resolution or declare explicit dependency with fixed version.

    dependencies {
      implementation("com.fasterxml.jackson.core:jackson-core:2.15.0")
      implementation("com.fasterxml.jackson.core:jackson-databind:2.15.0")
    }

    OR use resolutionStrategy.force:

    configurations.all {
      resolutionStrategy {
        force(
          "com.fasterxml.jackson.core:jackson-core:2.15.0",
          "com.fasterxml.jackson.core:jackson-databind:2.15.0"
        )
      }
    }

4) BouncyCastle (`org.bouncycastle:bcprov-jdk18on`)
- Detected: 1.81 with CVE; recommended upgrade: 1.84+.
- Remediation (Gradle):

    configurations.all {
      resolutionStrategy {
        force("org.bouncycastle:bcprov-jdk18on:1.84")
      }
    }

5) Spring Core (`org.springframework:spring-core`)
- Detected: 5.3.27. CVE notes: one HIGH issue flagged with "Fixed version: not fixed".
- Remediation: evaluate upgrading to a supported Spring release line (e.g., Spring Framework 5.3.x LTS latest or consider migrating to Spring 6.x if compatible). If vendor hasn't released a fix, consider compensating controls or code-level mitigation.

General remediation steps (non-destructive, `--fix` mode behavior)
1. Add explicit forced versions or dependency declarations to `build.gradle.kts` to prefer patched versions for transitive dependencies. This is non-destructive and does not modify sources except `build.gradle.kts` if you choose to apply changes manually.

2. Rebuild and run tests locally to ensure no regressions:

  ./gradlew clean build

3. Re-run `docker scout quickview fs://.` and `docker scout cves fs://.` to verify the vulnerability counts drop.

Exact Gradle snippet to paste into `build.gradle.kts` (insert near top-level, for example after `repositories { ... }`):

configurations.all {
  resolutionStrategy {
    // Force patched versions for transitive vulnerabilities
    force(
      "org.yaml:snakeyaml:2.0",
      "com.fasterxml.jackson.core:jackson-core:2.15.0",
      "com.fasterxml.jackson.core:jackson-databind:2.15.0",
      "org.bouncycastle:bcprov-jdk18on:1.84"
    )
  }
}

Notes and caution
- Do NOT commit these changes automatically. This file is a suggested patch — review compatibility and run the test suite before committing.
- Some fixes (Spring Framework) may require code changes or dependency migrations rather than a simple version bump; validate runtime compatibility.
- For Go stdlib issues, the fix is to update the Go toolchain in images or rebuild images using an updated base image.

Proposed next actions
- I can create a branch and apply a minimal `build.gradle.kts` edit with the `resolutionStrategy.force(...)` snippet, run `./gradlew clean build`, and show the diff for your review (I will not commit without confirmation).
- Or I can just produce a PR-ready patch file and the exact commands to apply.

Let me know which of the proposed next actions you'd like me to take.

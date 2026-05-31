# Multi-stage Dockerfile building frontend (Vite) and backend (Gradle/Java)
# - Frontend: builds web/ using Node
# - Backend: builds JVM JAR with Gradle
# - Runtime: small JRE image with the built JAR and static assets copied to ./static

########################
# Frontend build stage
########################
FROM node:24-alpine AS frontend-builder
WORKDIR /src/web
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
COPY web/package*.json ./
RUN npm ci --silent
# ImageMagick and librsvg are required by scripts/make-favicon.sh
# `rsvg-convert` (from librsvg) is used by ImageMagick to rasterize SVGs
RUN apk add --no-cache imagemagick librsvg
COPY web/ ./
RUN npm run build

########################
# Backend build stage
########################
FROM gradle:8.4-jdk21 AS backend-builder
WORKDIR /src
# Run the build as root inside the build stage to avoid granting
# non-root users write ownership of copied files (addresses S6504).
USER root
# Copy only the files and directories required to run the Gradle build.
# Avoid copying the entire build context to reduce leaked secrets and
# unnecessary files in the image (see Sonar rule S6470).
# Adjust these paths if your build requires additional files.
COPY gradlew ./
COPY gradle/ ./gradle/
COPY build.gradle.kts settings.gradle ./
# Source and other inputs used by the build
COPY src/ ./src/
RUN mkdir assets && ./gradlew --no-daemon clean assemble -x test
# Optional: switch back to the default user if necessary (not required for build stage)
USER root

########################
# Temurin runtime stage (source of JRE)
########################
FROM eclipse-temurin:21-jre-jammy AS temurin

########################
# Runtime image (rootless nginx + Java)
########################
FROM nginxinc/nginx-unprivileged:1.25 AS runtime
WORKDIR /app

# Install utilities and a Temurin Java 21 JRE, then add fonts
USER root
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		fontconfig \
		curl \
		ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy JRE from the official Temurin image to avoid network tarball downloads
COPY --from=temurin /opt /opt
RUN set -eux; \
		for d in /opt/*; do \
			if [ -x "$d/bin/java" ]; then \
				ln -s "$d" /opt/jdk || true; \
				ln -sf "$d/bin/java" /usr/local/bin/java; \
				break; \
			fi; \
		done

# Fetch bundled fonts (retry on transient network failures)
RUN set -eux; \
	mkdir -p /usr/share/fonts/truetype/vellaris; \
	cd /usr/share/fonts/truetype/vellaris; \
	curl --fail --show-error --location --retry 3 -o 'Cinzel[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf; \
	curl --fail --show-error --location --retry 3 -o 'EBGaramond[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf; \
	curl --fail --show-error --location --retry 3 -o 'LibreBaskerville[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf; \
	curl --fail --show-error --location --retry 3 -o Cardo-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/cardo/Cardo-Regular.ttf; \
	curl --fail --show-error --location --retry 3 -o GentiumPlus-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/gentiumplus/GentiumPlus-Regular.ttf; \
	curl --fail --show-error --location --retry 3 -o 'CormorantGaramond[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf; \
	curl --fail --show-error --location --retry 3 -o Allura-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/allura/Allura-Regular.ttf; \
	curl --fail --show-error --location --retry 3 -o GreatVibes-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf; \
	curl --fail --show-error --location --retry 3 -o URWChanceryL.ttf https://raw.githubusercontent.com/hpi-swa-teaching/Scamper-SWT15/master/build-support/fonts/URW%20Chancery%20L%20Medium%20Italic%20U.ttf; \
	curl --fail --show-error --location --retry 3 -o Z003.ttf https://raw.githubusercontent.com/ArtifexSoftware/urw-base35-fonts/master/fonts/Z003-MediumItalic.ttf; \
	fc-cache -f -v

# Copy backend jar and frontend static build output
COPY --from=backend-builder /src/build/libs/*.jar ./app.jar
COPY --from=frontend-builder /src/web/dist ./static
COPY assets/ ./assets/

# Create non-root user and ensure nginx runtime dirs are writable
RUN addgroup --system vellaris \
	&& adduser --system --ingroup vellaris --home /home/vellaris --shell /usr/sbin/nologin vellaris \
	&& mkdir -p /home/vellaris /var/log/nginx /var/run /var/cache/nginx /var/lib/nginx/body /app/static /app/static/fonts \
	&& cp /usr/share/fonts/truetype/vellaris/*.ttf ./static/fonts/ || true \
	&& chown -R vellaris:vellaris /home/vellaris /var/log/nginx /var/run /var/cache/nginx /var/lib/nginx /app /usr/share/fonts/truetype/vellaris

# Switch to non-root user; nginx-unprivileged runs as non-root by default
USER vellaris
ENV JAVA_OPTS=""
ENV JAVA_HOME=/opt/jdk
ENV PATH=/opt/jdk/bin:$PATH
EXPOSE 8080
# Start Java in background and run nginx (already configured to run rootless)
CMD ["sh", "-c", "java $JAVA_OPTS -cp app.jar nortantis.api.MapApiServer & nginx -g 'daemon off;' "]

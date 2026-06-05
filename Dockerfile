# syntax=docker/dockerfile:1.4
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
ENV NPM_CONFIG_PRODUCTION=false
# Use BuildKit cache for npm to speed repeated builds
RUN --mount=type=cache,target=/root/.npm npm ci --silent --include=dev
# ImageMagick and librsvg are required by scripts/make-favicon.sh
# `rsvg-convert` (from librsvg) is used by ImageMagick to rasterize SVGs
RUN apk add --no-cache imagemagick librsvg
COPY web/ ./
RUN chmod +x scripts/*.sh
ENV NODE_ENV=production
# Run Vite build in production mode
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
# Use BuildKit cache for Gradle to speed builds between runs
COPY assets/ assets/
COPY src/ src/
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle ./
RUN --mount=type=cache,target=/root/.gradle ./gradlew jar

########################
# Runtime image (Alpine + nginx + Temurin JRE)
########################
FROM eclipse-temurin:26-jre-ubi10-minimal AS runtime
WORKDIR /app

# Install nginx and common utilities; upgrade base packages first
USER root
RUN set -eux; \
	if command -v apk >/dev/null 2>&1; then \
		apk update && apk upgrade --no-cache && apk add --no-cache nginx curl fontconfig tzdata; \
	elif command -v microdnf >/dev/null 2>&1; then \
		microdnf -y update && microdnf -y install nginx curl fontconfig tzdata && microdnf clean all; \
	else \
		echo "No supported package manager found" >&2; exit 1; \
	fi

# Fetch bundled fonts (retry on transient network failures)
RUN set -eux; \
	mkdir -p /usr/share/fonts/truetype/vellaris; \
	cd /usr/share/fonts/truetype/vellaris; \
	curl -s --fail --show-error --location --retry 3 -o 'Cinzel[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf; \
	curl -s --fail --show-error --location --retry 3 -o 'EBGaramond[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf; \
	curl -s --fail --show-error --location --retry 3 -o 'LibreBaskerville[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf; \
	curl -s --fail --show-error --location --retry 3 -o Cardo-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/cardo/Cardo-Regular.ttf; \
	curl -s --fail --show-error --location --retry 3 -o GentiumPlus-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/gentiumplus/GentiumPlus-Regular.ttf; \
	curl -s --fail --show-error --location --retry 3 -o 'CormorantGaramond[wght].ttf' https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf; \
	curl -s --fail --show-error --location --retry 3 -o Allura-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/allura/Allura-Regular.ttf; \
	curl -s --fail --show-error --location --retry 3 -o GreatVibes-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf; \
	curl -s --fail --show-error --location --retry 3 -o URWChanceryL.ttf https://raw.githubusercontent.com/hpi-swa-teaching/Scamper-SWT15/master/build-support/fonts/URW%20Chancery%20L%20Medium%20Italic%20U.ttf; \
	curl -s --fail --show-error --location --retry 3 -o Z003.ttf https://raw.githubusercontent.com/ArtifexSoftware/urw-base35-fonts/master/fonts/Z003-MediumItalic.ttf; \
	fc-cache -f -v

# Copy backend jar and frontend static build output
COPY --from=backend-builder /src/build/libs/*.jar ./app.jar
COPY --from=frontend-builder /src/web/dist ./static

# Copy custom nginx main config (overwrite default)
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx /app/static/fonts
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy bundled fonts (expect fonts to be present when build reaches this stage)
RUN cp -r /usr/share/fonts/* ./static/fonts/

# Ensure runtime dirs are writable
RUN chmod -R a+rwX /app /var/cache/nginx /var/run /var/log/nginx

# Expose standard HTTP port
EXPOSE 80

# Entrypoint starts Java in background then runs nginx in foreground
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER root
ENV JAVA_OPTS="-Xms2g -Xmx2g -XX:+UseG1GC"
CMD ["/usr/local/bin/docker-entrypoint.sh"]

# Multi-stage Dockerfile building frontend (Vite) and backend (Gradle/Java)
# - Frontend: builds web/ using Node
# - Backend: builds JVM JAR with Gradle
# - Runtime: small JRE image with the built JAR and static assets copied to ./static

########################
# Frontend build stage
########################
FROM node:20-alpine AS frontend-builder
WORKDIR /src/web
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
# Copy the whole project and run Gradle to produce the JAR
COPY --chown=gradle:gradle . .
RUN gradle --no-daemon clean assemble -x test

########################
# Runtime image (Java + Nginx)
########################
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
# Install nginx
RUN apt-get update \
	&& apt-get install -y --no-install-recommends nginx \
	&& rm -rf /var/lib/apt/lists/*

# Copy backend jar
COPY --from=backend-builder /src/build/libs/*.jar ./app.jar
# Copy frontend static build output (assumes Vite output is at web/dist)
COPY --from=frontend-builder /src/web/dist ./static

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/sites-available/default

ENV JAVA_OPTS=""
EXPOSE 80
# Start Java in background and run nginx in foreground
CMD ["sh", "-c", "java $JAVA_OPTS -cp app.jar nortantis.api.MapApiServer & nginx -g 'daemon off;' "]

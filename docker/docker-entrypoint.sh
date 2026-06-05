#!/bin/sh
set -eu

# Start the Java backend in background, but send stdout/stderr to container logs
echo "Starting Java backend..."
# Redirect Java stdout/stderr to the main PID's fds so Docker captures them
java $JAVA_OPTS -Djava.awt.headless=true -cp /app/app.jar nortantis.api.MapApiServer > /proc/1/fd/1 2>/proc/1/fd/2 &
JAVA_PID=$!

# Start nginx in foreground
echo "Starting nginx..."
nginx -g 'daemon off;'

# When nginx exits, stop the Java process as well
kill "$JAVA_PID"
wait "$JAVA_PID"

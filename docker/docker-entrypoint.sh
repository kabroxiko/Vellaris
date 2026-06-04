#!/bin/sh
set -eu

# Start the Java backend in background
echo "Starting Java backend..."
nohup java $JAVA_OPTS -Djava.awt.headless=true -cp /app/app.jar nortantis.api.MapApiServer > /var/log/java.out 2>&1 &
JAVA_PID=$!

# Start nginx in foreground
echo "Starting nginx..."
nginx -g 'daemon off;'

# When nginx exits, stop the Java process as well
kill "$JAVA_PID" || true
wait "$JAVA_PID" || true

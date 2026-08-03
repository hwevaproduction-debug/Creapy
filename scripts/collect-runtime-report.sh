#!/bin/sh
# Collect runtime information and logs for Creapy staging deployment
# Run this on the staging EC2 host as the deploy user (creapy) or with sudo privileges.
# Produces a report directory with logs and a short summary file.

set -eu

TIMESTAMP=$(date +%Y%m%dT%H%M%S)
OUTDIR="/tmp/creapy-staging-$TIMESTAMP"
mkdir -p "$OUTDIR"

COMPOSE_FILE=${COMPOSE_FILE:-/home/creapy/app/docker-compose.yml}
APP_DIR=$(dirname "$COMPOSE_FILE")

REPORT_FILE="$OUTDIR/report-summary-$TIMESTAMP.txt"
LOGFILE="$OUTDIR/compose-logs-$TIMESTAMP.log"

echo "Creapy staging runtime report" > "$REPORT_FILE"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT_FILE"
echo "Host: $(hostname -f)" >> "$REPORT_FILE"
echo "Compose file: $COMPOSE_FILE" >> "$REPORT_FILE"

echo "\n--- Docker / Compose status ---" >> "$REPORT_FILE"
if command -v docker >/dev/null 2>&1; then
  echo "Docker version:" >> "$REPORT_FILE"
  docker version >> "$REPORT_FILE" 2>&1 || true

  echo "\nDocker ps:" >> "$REPORT_FILE"
  docker ps --no-trunc >> "$REPORT_FILE" 2>&1 || true

  echo "\nDocker compose ps:" >> "$REPORT_FILE"
  docker compose -f "$COMPOSE_FILE" ps >> "$REPORT_FILE" 2>&1 || true
else
  echo "Docker not found on PATH" >> "$REPORT_FILE"
fi

# Collect compose logs (tail) to a separate file
if command -v docker >/dev/null 2>&1; then
  echo "Collecting docker compose logs to $LOGFILE"
  docker compose -f "$COMPOSE_FILE" logs --no-color --timestamps --tail=500 > "$LOGFILE" 2>&1 || true
  echo "Logs written to: $LOGFILE" >> "$REPORT_FILE"
else
  echo "Skipping logs; docker not available" >> "$REPORT_FILE"
fi

# Health endpoints to probe
echo "\n--- Health endpoint checks ---" >> "$REPORT_FILE"
BACKEND_HEALTH=${BACKEND_HEALTH:-http://localhost:5000/health}
FRONTEND_ROOT=${FRONTEND_ROOT:-http://localhost/}

printf "Checking backend health: %s\n" "$BACKEND_HEALTH" >> "$REPORT_FILE"
if command -v curl >/dev/null 2>&1; then
  echo "Backend health response:" >> "$REPORT_FILE"
  curl -sS -I "$BACKEND_HEALTH" >> "$REPORT_FILE" 2>&1 || echo "(curl failed for backend health)" >> "$REPORT_FILE"
  echo "\nBackend health body:" >> "$REPORT_FILE"
  curl -sS "$BACKEND_HEALTH" >> "$REPORT_FILE" 2>&1 || echo "(curl failed body)" >> "$REPORT_FILE"

  echo "\nFrontend root response headers:" >> "$REPORT_FILE"
  curl -sS -I "$FRONTEND_ROOT" >> "$REPORT_FILE" 2>&1 || echo "(curl failed for frontend root)" >> "$REPORT_FILE"
else
  echo "curl not found; cannot probe HTTP endpoints" >> "$REPORT_FILE"
fi

# Postgres container ready check (if present)
echo "\n--- Postgres readiness (container) ---" >> "$REPORT_FILE"
if docker ps --format '{{.Names}}' | grep -qi "postgres" 2>/dev/null; then
  POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i postgres | head -n1)
  echo "Found Postgres container: $POSTGRES_CONTAINER" >> "$REPORT_FILE"
  echo "pg_isready output:" >> "$REPORT_FILE"
  docker exec -i "$POSTGRES_CONTAINER" pg_isready -U postgres -d creapy >> "$REPORT_FILE" 2>&1 || true
else
  echo "Postgres container not found by name filter 'postgres'" >> "$REPORT_FILE"
fi

# Filesystem checks for uploads
echo "\n--- Uploads directory checks ---" >> "$REPORT_FILE"
UPLOADS_DIR=${UPLOADS_DIR:-/srv/uploads}
if [ -d "$UPLOADS_DIR" ]; then
  echo "Uploads dir exists: $UPLOADS_DIR" >> "$REPORT_FILE"
  echo "Ownership and perms:" >> "$REPORT_FILE"
  stat -c "%U:%G %a" "$UPLOADS_DIR" >> "$REPORT_FILE" 2>&1 || true
  echo "Top-level listing (head):" >> "$REPORT_FILE"
  ls -la "$UPLOADS_DIR" | head -n 50 >> "$REPORT_FILE" 2>&1 || true
else
  echo "Uploads dir not found: $UPLOADS_DIR" >> "$REPORT_FILE"
fi

# Prisma migration status if prisma binary exists in backend image or host
echo "\n--- Prisma migration status (if available) ---" >> "$REPORT_FILE"
# Attempt to run prisma migrate status locally in backend dir if prisma is installed
if [ -f "$APP_DIR/real-app-backend-main/prisma/schema.prisma" ]; then
  echo "Prisma schema found at $APP_DIR/real-app-backend-main/prisma/schema.prisma" >> "$REPORT_FILE"
  if command -v npx >/dev/null 2>&1; then
    echo "Running: npx prisma migrate status --schema=$APP_DIR/real-app-backend-main/prisma/schema.prisma" >> "$REPORT_FILE"
    (cd "$APP_DIR/real-app-backend-main" && npx prisma migrate status --schema=prisma/schema.prisma) >> "$REPORT_FILE" 2>&1 || echo "(prisma migrate status failed)" >> "$REPORT_FILE"
  else
    echo "npx not available; skip prisma status" >> "$REPORT_FILE"
  fi
else
  echo "Prisma schema not present in expected location; skipping prisma status check" >> "$REPORT_FILE"
fi

# Package the report directory for retrieval
echo "\nReport directory: $OUTDIR" >> "$REPORT_FILE"
ls -la "$OUTDIR" >> "$REPORT_FILE" 2>&1 || true

echo "Report generation complete. Tarball created in same dir is optional. Example: tar -czf /tmp/creapy-staging-$TIMESTAMP.tgz -C /tmp creapy-staging-$TIMESTAMP" >> "$REPORT_FILE"

printf "Report written to: %s\n" "$REPORT_FILE"
printf "Logs written to: %s\n" "$LOGFILE"

exit 0

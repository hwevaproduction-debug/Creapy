#!/bin/sh
# POSIX-compliant helper to validate docker-compose configuration and
# print recommended commands to build and bring up the stack for manual testing.
# Create the file and make it executable: chmod +x scripts/compose-validate.sh

COMPOSE_FILE="docker-compose.yml"

print_error() {
  printf "%s\n" "$1" >&2
}

# Check that docker CLI is available
if ! command -v docker >/dev/null 2>&1; then
  print_error "Error: docker is not installed or not in PATH. Please install Docker: https://docs.docker.com/get-docker/"
  exit 2
fi

# Check that 'docker compose' subcommand is available (Docker v20+ or compose plugin)
if ! docker compose version >/dev/null 2>&1; then
  print_error "Error: 'docker compose' subcommand is not available. Ensure you have Docker Compose v2 (the 'docker compose' plugin) or install compose separately."
  exit 3
fi

# Validate the compose file
printf "Validating %s with: docker compose -f %s config\n" "$COMPOSE_FILE" "$COMPOSE_FILE"

if ! docker compose -f "$COMPOSE_FILE" config; then
  print_error "docker compose configuration validation FAILED. Fix the reported issues above."
  exit 4
fi

printf "\nCompose configuration is valid. Recommended commands (run manually):\n\n"
printf "# Build images (if you want to build locally)\n"
printf "docker compose -f %s build --parallel\n\n" "$COMPOSE_FILE"

printf "# Start the stack in the background (detached)\n"
printf "docker compose -f %s up -d\n\n" "$COMPOSE_FILE"

printf "# Tail logs for all services (press Ctrl-C to stop)\n"
printf "docker compose -f %s logs -f --tail=200\n\n" "$COMPOSE_FILE"

printf "# To bring the stack down and remove anonymous volumes\n"
printf "docker compose -f %s down --volumes\n\n" "$COMPOSE_FILE"

printf "# To rebuild and recreate containers (no downtime guarantees)\n"
printf "docker compose -f %s pull && docker compose -f %s build --parallel && docker compose -f %s up -d --force-recreate\n\n" "$COMPOSE_FILE" "$COMPOSE_FILE" "$COMPOSE_FILE"

printf "# Helpful: inspect service status\n"
printf "docker compose -f %s ps\n\n" "$COMPOSE_FILE"

printf "# Short loop snippet (commented) to wait for a backend /health endpoint to return HTTP 200\n"
cat <<'INNER_EOF'
# Example wait loop (run manually):
# SERVICE_URL="http://localhost:8000/health"
# until curl -sSf "$SERVICE_URL" >/dev/null 2>&1; do
#   printf "."; sleep 1
# done
# printf "\nService is healthy: %s\n" "$SERVICE_URL"
INNER_EOF

printf "\nDone.\n"
exit 0

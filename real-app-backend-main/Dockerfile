# Multi-stage Dockerfile for production
# Build stage
FROM node:20-slim AS build

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy rest of the application source
COPY . .

# Generate Prisma client (uses prisma/schema.prisma)
RUN npx prisma generate --schema=prisma/schema.prisma

# Production stage
FROM node:20-slim AS production

# Create non-root user 'app' with UID 1000
RUN useradd --uid 1000 --create-home --shell /bin/false app || true

WORKDIR /usr/src/app

# Copy package manifests and install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --silent

# Copy app source (after installing production deps) and set ownership
COPY --chown=app:app --from=build /usr/src/app .

# Ensure uploads directory exists and is owned by app
RUN mkdir -p /srv/uploads \
    && chown -R app:app /usr/src/app /srv/uploads

USER app

ENV NODE_ENV=production
EXPOSE 5000

# Healthcheck: rely on existing /health endpoint, fallback to /
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:5000/health || curl --fail http://localhost:5000/ || exit 1

ENTRYPOINT ["node", "server.js"]

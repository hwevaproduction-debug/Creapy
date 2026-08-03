# Multi-stage Dockerfile for production React build
# Builder: use Node 20 slim and run as non-root for build steps
FROM node:20-slim AS builder

# Create app directory and a non-root user
WORKDIR /app
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser

# Copy package manifests and install dependencies as non-root
COPY package*.json ./
RUN chown -R appuser:appgroup /app
USER appuser

# Install dependencies (use ci if lockfile present)
RUN if [ -f package-lock.json ]; then npm ci --silent --prefer-offline; else npm install --silent --prefer-offline; fi

# Copy source and build
COPY --chown=appuser:appgroup . .
RUN npm run build

# Production image: nginx serving static files
FROM nginx:stable-alpine

# Remove default nginx static files and copy build artifacts
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/build /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Use default nginx user and default CMD provided by base image
# (nginx:stable-alpine runs as nginx user)
CMD ["nginx", "-g", "daemon off;"]

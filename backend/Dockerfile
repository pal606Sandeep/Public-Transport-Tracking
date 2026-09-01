# Multi-stage Dockerfile for the transport-tracking API + worker.
#
# Build stage: install dev deps + compile TypeScript with `tsc`.
# Runtime stage: prod-only deps, copies dist, runs as non-root.
#
# `npm run build` outputs to `dist/`. The runtime image runs either:
#   node dist/index.js     (API)
#   node dist/worker.js    (background worker)
# Use the `api` / `worker` Compose services or override `CMD` directly.

# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install build deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy sources and build.
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrate-mongo-config.js ./
COPY migrations ./migrations

RUN npm run build

# Drop dev deps for the runtime image.
RUN npm prune --omit=dev


# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Non-root user.
RUN addgroup -S app && adduser -S app -G app

# Bring in just the bits we need.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrate-mongo-config.js ./migrate-mongo-config.js
COPY --from=build /app/migrations ./migrations

USER app

EXPOSE 4000

# Default = API server. Worker uses the same image and overrides:
#   command: ["node", "dist/worker.js"]
CMD ["node", "dist/index.js"]
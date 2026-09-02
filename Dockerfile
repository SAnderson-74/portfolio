# syntax=docker/dockerfile:1

# ============================================================================
# Stage 1 — build
# This entire stage is thrown away once it has produced dist/. Nothing here
# reaches the final image.
# ============================================================================

FROM node:24-slim AS build

WORKDIR /app

# Copy only the dependency manifests first. Docker caches each layer, so as
# long as these two files are unchanged, the expensive npm ci below is reused
# from cache — even when the site's content has changed. Copying everything
# up front would invalidate that cache on every edit.
COPY package.json package-lock.json ./

# npm ci, not npm install. ci installs exactly what package-lock.json
# specifies and fails if the lockfile is out of sync, so the build is
# reproducible. npm install is allowed to quietly resolve new versions.
RUN npm ci

# Now the source. This layer changes on every edit, which is why it comes
# after the dependency install rather than before.
COPY . .

RUN npm run build

# ============================================================================
# Stage 2 — serve
# Starts from a clean base. Only the built output crosses over.
# ============================================================================

FROM caddy:2-alpine

# --from=build reaches back into the previous stage and takes only this
# directory. Node, npm, and node_modules are all left behind.
COPY --from=build /app/dist /srv

COPY Caddyfile /etc/caddy/Caddyfile

# Documentation only — this does not publish the port. It records the port
# the container listens on so humans and tooling know what to map.
EXPOSE 8080

# Fails the container's health status if Caddy stops answering. Container
# platforms use this to decide whether to restart.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --spider -q http://localhost:8080/ || exit 1

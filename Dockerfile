# =============================================================================
# GUM — Multi-stage build
# Builds the React frontend and Rust backend into a single container.
# The backend serves the frontend static files via the static_dir config.
# =============================================================================

# ─── Stage 1: Build the frontend ─────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY public/ public/
COPY src/ src/
RUN npm run build

# ─── Stage 2: Build the backend ──────────────────────────────────────────────
FROM rust:1-alpine AS backend-builder

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

WORKDIR /app/backend
COPY backend/Cargo.toml backend/Cargo.lock* ./
# Create dummy lib+bin to cache dependency compilation
RUN mkdir src && echo "fn main() {}" > src/main.rs && touch src/lib.rs \
    && cargo build --release 2>/dev/null || true \
    && rm -rf src
# Now copy the real source and build
COPY backend/src/ src/
RUN cargo build --release

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM alpine:3.23 AS runtime

RUN apk add --no-cache ca-certificates

# Create a non-root user
RUN addgroup -S gum && adduser -S gum -G gum

WORKDIR /app

# Copy the built backend binary
COPY --from=backend-builder /app/backend/target/release/gum-backend ./gum-backend

# Copy the built frontend assets
COPY --from=frontend-builder /app/dist ./static/

# Copy example config (user should mount their own gum.toml)
COPY backend/gum.example.toml ./gum.example.toml

# Ensure the data directory exists and is writable
RUN mkdir -p /app/data && chown -R gum:gum /app

USER gum

ENV GUM_CONFIG=/app/gum.toml

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

ENTRYPOINT ["./gum-backend"]

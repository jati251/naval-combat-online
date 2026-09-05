# syntax=docker/dockerfile:1

# --- Stage 1: Build Frontend and Server ---
FROM ubuntu:24.04 AS builder
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@latest && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install

COPY . .

# Build Vite client to dist/ and TypeScript server to server/dist/
RUN pnpm run build

# --- Stage 2: Production Runtime ---
FROM ubuntu:24.04 AS runner
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@latest && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod

# Copy compiled frontend static assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/healthz').then(r => r.ok ? process.exit(0) : process.exit(1))"

CMD ["node", "server/dist/index.js"]

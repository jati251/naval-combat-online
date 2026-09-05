# syntax=docker/dockerfile:1

# --- Stage 1: Build Frontend and Server ---
FROM node:22-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install

COPY . .

# Build Vite client to dist/ and TypeScript server to server/dist/
RUN pnpm run build

# --- Stage 2: Production Runtime ---
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install pnpm
RUN npm install -g pnpm@latest

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

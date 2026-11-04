# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Supply proxy_ca with --secret in managed environments. Standard builders use
# the system CA store. Never copy the development .env or proxy CA into a layer.
RUN --mount=type=secret,id=proxy_ca --mount=type=cache,target=/root/.npm \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    PRISMA_SCHEMA_ENGINE_BINARY=/usr/local/bin/node npm ci --strict-ssl=true --no-audit --no-fund
FROM dependencies AS tools
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npm run db:generate
FROM tools AS builder
RUN npm run build
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 UPLOAD_DIR=/app/.data/uploads
RUN mkdir -p /app/.data/uploads && chown -R node:node /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node","server.js"]

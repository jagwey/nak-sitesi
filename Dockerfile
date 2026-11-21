# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma/ prisma/
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .

FROM tools AS build
ARG S3_PUBLIC_BASE_URL
RUN npm run build && rm -rf .next/cache

FROM base AS production-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM base AS app
ENV NODE_ENV=production \
    PORT=3000 \
    PYTHON_BIN=/opt/embroidery/bin/python
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3-venv \
    && python3 -m venv /opt/embroidery \
    && /opt/embroidery/bin/pip install --no-cache-dir pyembroidery==1.5.1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/public ./public
COPY --from=build /app/tools/embroidery/parse.py ./tools/embroidery/parse.py
COPY --chown=node:node --from=build /app/.next ./.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=90s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health', { signal: AbortSignal.timeout(5000) }).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

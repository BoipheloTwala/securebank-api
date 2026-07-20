# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 securebank

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --frozen-lockfile --omit=dev && \
    npm run prisma:generate && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R securebank:nodejs /app
USER securebank

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

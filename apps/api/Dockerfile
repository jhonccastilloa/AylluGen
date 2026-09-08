# -------- Etapa 1: Builder --------
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build


# -------- Etapa 2: Production --------
FROM node:22-slim AS production

ENV NODE_ENV=production

RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts



EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist"]

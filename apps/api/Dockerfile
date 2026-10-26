# Build context is the monorepo root, not apps/api.
FROM node:22-slim AS builder
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.3.4
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.packages.base.json tsconfig.packages.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/shared/package.json packages/shared/package.json
# Root supplies shared build tools; app-specific dependencies stay scoped.
RUN pnpm --filter ayllugen-workspace --filter ayllu-gen-backend... install --frozen-lockfile

COPY packages/core packages/core
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm build:shared
WORKDIR /workspace/apps/api
# Schema generation does not connect to this placeholder database.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm prisma:generate
RUN pnpm build

FROM node:22-slim AS production
ENV NODE_ENV=production
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
# Preserve pnpm's relative links and the shared runtime package.
# Prisma migration CLI remains available; no download at container startup.
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/core ./packages/core
COPY --from=builder /workspace/packages/shared ./packages/shared
COPY --from=builder /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=builder /workspace/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist"]

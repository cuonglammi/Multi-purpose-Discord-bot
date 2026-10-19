# Build from the repository root so npm workspaces and the Prisma schema stay in the same context.
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY apps/backend apps/backend
RUN npm run prisma:generate -w apps/backend
RUN npm run build -w apps/backend

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/backend/package.json apps/backend/package.json
COPY --from=build /app/apps/backend/prisma apps/backend/prisma
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/node_modules ./node_modules

WORKDIR /app/apps/backend
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]

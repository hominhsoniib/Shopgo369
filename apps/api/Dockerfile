# ===== 369 Platform API — Dockerfile (development-friendly, multi-stage cho prod) =====
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json ./
RUN pnpm install

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000
CMD ["node", "dist/main"]

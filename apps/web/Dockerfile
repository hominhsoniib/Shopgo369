FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY package.json ./
RUN pnpm install

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

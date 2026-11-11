
# Stage 1: Install dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN pnpm install --frozen-lockfile --ignore-scripts --config.strict-dep-builds=false

# Stage 2: Build NestJS application
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# Stage 3: Production
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN pnpm install --prod --frozen-lockfile --ignore-scripts --config.strict-dep-builds=false

# Copy compiled NestJS application
COPY --from=builder /app/dist ./dist

# Copy environment configuration
COPY .env* ./

# Create storage and watch directories
RUN mkdir -p \
    storage/configurations \
    storage/jobs \
    storage/processing \
    storage/notifications \
    storage/devices \
    /external-watch-folder \
    /monitored-folders

EXPOSE 1001

CMD ["node", "dist/main.js"]

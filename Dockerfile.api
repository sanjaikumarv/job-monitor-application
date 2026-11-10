FROM node:24-alpine AS builder

WORKDIR /app
COPY job-api/package.json job-api/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile || pnpm install

COPY job-api/ ./
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create storage directory structure
RUN mkdir -p storage/configurations storage/jobs storage/processing storage/notifications storage/devices

EXPOSE 3001
CMD ["node", "dist/src/main.js"]


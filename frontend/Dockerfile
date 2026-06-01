# MalaSafe Frontend Dockerfile

# Stage 1: Dependencies
FROM node:25 AS deps
WORKDIR /app
COPY package*.json ./

RUN npm ci

# Stage 2: Builder
FROM node:25 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run Next.js build (ensure next.config.js has output: 'standalone')
RUN npm run build

# Stage 3: Production
FROM node:25 AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build files from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]

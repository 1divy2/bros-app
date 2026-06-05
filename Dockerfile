FROM node:20-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/api-zod/package.json artifacts/api-zod/
COPY artifacts/bros/package.json artifacts/bros/
COPY lib/db/package.json lib/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=deps /app/artifacts/api-zod/node_modules ./artifacts/api-zod/node_modules
COPY --from=deps /app/artifacts/bros/node_modules ./artifacts/bros/node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules

# Set environment to production during build for optimizations
ENV NODE_ENV=production
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy compiled backend and frontend
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/bros/dist ./artifacts/bros/dist
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=builder /app/artifacts/api-zod/package.json ./artifacts/api-zod/package.json
COPY --from=builder /app/artifacts/bros/package.json ./artifacts/bros/package.json

# Copy production dependencies (we run install again but only for production)
# Alternatively, copy the node_modules from deps if they have been pruned.
# For safety, we will just copy the entire builder node_modules, 
# or reinstall production deps.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=builder /app/artifacts/api-zod/node_modules ./artifacts/api-zod/node_modules
COPY --from=builder /app/artifacts/bros/node_modules ./artifacts/bros/node_modules
COPY --from=builder /app/lib/db/node_modules ./lib/db/node_modules

# Add the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

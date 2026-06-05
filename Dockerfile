FROM node:22-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/bros/package.json artifacts/bros/
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json lib/api-spec/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=deps /app/artifacts/bros/node_modules ./artifacts/bros/node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=deps /app/lib/api-zod/node_modules ./lib/api-zod/node_modules
COPY --from=deps /app/lib/api-client-react/node_modules ./lib/api-client-react/node_modules

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
COPY --from=builder /app/artifacts/bros/package.json ./artifacts/bros/package.json
COPY --from=builder /app/lib/db/package.json ./lib/db/package.json
COPY --from=builder /app/lib/api-zod/package.json ./lib/api-zod/package.json
COPY --from=builder /app/lib/api-client-react/package.json ./lib/api-client-react/package.json

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=builder /app/artifacts/bros/node_modules ./artifacts/bros/node_modules
COPY --from=builder /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=builder /app/lib/api-zod/node_modules ./lib/api-zod/node_modules
COPY --from=builder /app/lib/api-client-react/node_modules ./lib/api-client-react/node_modules

# Add the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

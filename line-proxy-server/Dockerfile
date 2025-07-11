# Use official Node.js runtime as base image
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
RUN npm ci
COPY src ./src
RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist

# Copy package.json for runtime
COPY package.json ./

# Create logs directory
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

# Create health check script
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost:$PORT/api/health || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh && \
    chown nodeuser:nodejs /healthcheck.sh

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Labels for better container management
LABEL \
    org.opencontainers.image.title="LINE Proxy Server" \
    org.opencontainers.image.description="LINE API Proxy Server for Chrome Extension" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.vendor="Multi-Channel Reply Assistant" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/user/multi-channel-reply-assistant" \
    maintainer="Multi-Channel Reply Assistant Team"
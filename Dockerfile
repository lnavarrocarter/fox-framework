# 🦊 Fox Framework - Production Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# 🏗️ BUILD STAGE
# ==========================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build metadata
LABEL stage=builder
LABEL description="Fox Framework build stage"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY tsfox/ ./tsfox/
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies and clean npm cache
RUN npm prune --production && npm cache clean --force

# ==========================================
# 🚀 PRODUCTION STAGE
# ==========================================
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Add production metadata
LABEL maintainer="Fox Framework Team"
LABEL description="Fox Framework production container"
LABEL version="1.0.0"

# Install production dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S foxuser -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsfox ./tsfox
COPY --from=builder /app/src ./src

# Create logs directory
RUN mkdir -p logs && chown -R foxuser:nodejs logs

# Copy any additional production files
COPY --chown=foxuser:nodejs . .

# Switch to non-root user
USER foxuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

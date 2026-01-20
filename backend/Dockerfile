# ==========================================
# InvoiceMe Backend - Production Dockerfile
# ==========================================
# Multi-stage build for smaller image size
# Includes: Node.js, Prisma, Tesseract OCR

# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (nest CLI is now available from devDependencies)
RUN npm run build

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:18-slim

# Install runtime dependencies
# - openssl: Required for Prisma
# - tesseract-ocr: For OCR processing
# - tesseract-ocr-heb: Hebrew language pack
# - tesseract-ocr-eng: English language pack
RUN apt-get update && apt-get install -y \
    openssl \
    tesseract-ocr \
    tesseract-ocr-heb \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install ONLY production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for Debian platform
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/src/main.js"]

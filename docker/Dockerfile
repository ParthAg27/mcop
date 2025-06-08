# MightyMiner Node.js Production Docker Container
# Production-ready container for VPS deployment

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create non-root user for security
RUN addgroup -g 1001 -S mightyminer && \
    adduser -S mightyminer -u 1001 -G mightyminer

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=mightyminer:mightyminer . .

# Create necessary directories
RUN mkdir -p /app/logs /app/config /app/data && \
    chown -R mightyminer:mightyminer /app

# Set user
USER mightyminer

# Expose port (if web interface is needed)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start command
CMD ["npm", "start"]


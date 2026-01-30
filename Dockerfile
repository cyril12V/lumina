# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Create data directory for SQLite
RUN mkdir -p /data

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/lumina.db

EXPOSE 3000

CMD ["node", "dist/index.js"]

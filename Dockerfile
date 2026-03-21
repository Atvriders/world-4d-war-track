# Stage 1: Build frontend
FROM node:20.11-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build server
FROM node:20.11-alpine AS server-builder
WORKDIR /server
COPY server/package*.json ./
RUN npm ci
COPY server/ .

# Stage 3: Production
FROM node:20.11-alpine AS production
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy server
COPY --from=server-builder /server ./server

# Start script
COPY docker-start.sh ./
RUN chmod +x docker-start.sh

ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

CMD ["./docker-start.sh"]

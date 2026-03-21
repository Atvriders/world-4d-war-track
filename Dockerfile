# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder
WORKDIR /server
COPY server/package*.json ./
RUN npm ci
COPY server/ .

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install serve for static files
RUN npm install -g serve

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy server
COPY --from=server-builder /server ./server

# Start script
COPY docker-start.sh ./
RUN chmod +x docker-start.sh

EXPOSE 3000 3001

CMD ["./docker-start.sh"]

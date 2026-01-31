FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 8000

# Set environment variable
ENV PORT=8000
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]

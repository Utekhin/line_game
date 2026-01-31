FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 8000

# Set environment variable
ENV PORT=8000

# Start the server
CMD ["node", "server.js"]

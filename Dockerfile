# Use official Node LTS slim image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first (leverage Docker layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Use a non-root user for security
USER node

# Cloud Run expects the app to listen on $PORT
ENV PORT 8080
EXPOSE 8080

# Start the app
CMD ["node", "src/index.js"]

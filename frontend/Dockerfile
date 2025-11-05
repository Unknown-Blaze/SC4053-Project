# Frontend Dockerfile for Railway Deployment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Expose port (Railway will set PORT env variable)
EXPOSE 3000

# Start the application
# -s dist: Serve the dist directory
# -l: Port to listen on
# -L: Listen on all interfaces (0.0.0.0) not just localhost
CMD serve -s dist -l ${PORT:-3000} -L

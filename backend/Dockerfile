# Backend Dockerfile for Railway Deployment
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Node.js (needed for Hardhat)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for Node.js dependencies
COPY package*.json ./

# Install Node.js dependencies (Hardhat)
RUN npm install

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy contract files and compile with Hardhat
COPY contracts ./contracts
COPY hardhat.config.js ./
RUN npx hardhat compile

# Copy the rest of the application
COPY . .

# Copy environment files (if they exist, otherwise will be set via Railway env vars)
# Note: serviceAccountKey.json should be added via Railway secrets
COPY .env* ./

# Expose port 8000
EXPOSE 8000

# Start the FastAPI application on port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

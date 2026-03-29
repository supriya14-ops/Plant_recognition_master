# Use an official Python runtime as a parent image (includes built-in Linux deps for TF/OpenCV)
FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to the project root
WORKDIR /app

# Copy requirement list and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Install Node.js dependencies for backend
WORKDIR /app/backend
RUN npm install

# Expose port (Render sets PORT env variable, our server defaults to 5000)
EXPOSE 5000

# Set Node environment
ENV NODE_ENV=production

# Start the Node Backend
CMD ["node", "server.js"]

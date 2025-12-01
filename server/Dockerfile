FROM node:20

WORKDIR /app

# Show what we're working with
RUN pwd && ls -la

# Copy package files first (for better caching)
COPY package*.json ./
COPY shared/package*.json ./shared/

# Install root dependencies
RUN npm install

# Install shared dependencies  
RUN cd shared && npm install && cd ..

# Copy all source files
COPY . .

# Show files after copy
RUN echo "=== Files after COPY ===" && ls -la && echo "=== Shared files ===" && ls -la shared/ || echo "No shared directory"

# Build shared first, then server
RUN echo "=== Building shared ===" && cd shared && npm run build && cd ..
RUN echo "=== Building server ===" && npm run build

# Verify build output exists
RUN echo "=== Verifying build output ===" && pwd && ls -la && ls -la dist/ || (echo "ERROR: dist/ folder not found!" && exit 1)
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found! Contents of dist/:" && ls -la dist/ && exit 1)
RUN echo "=== Build successful! ===" && ls -la dist/index.js

# Expose port
EXPOSE 3001

# Start server with debug
CMD ["sh", "-c", "pwd && ls -la && ls -la dist/ && node dist/index.js"]


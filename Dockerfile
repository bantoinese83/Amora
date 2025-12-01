FROM node:20

WORKDIR /app

# Show what we're working with
RUN pwd && ls -la

# Copy package files first (for better caching)
COPY server/package*.json ./
COPY shared/package*.json ./shared/

# Install root dependencies (server dependencies)
RUN npm install

# Install shared dependencies  
RUN cd shared && npm install && cd ..

# Copy all source files
COPY server/ ./server/
COPY shared/ ./shared/

# Show files after copy
RUN echo "=== Files after COPY ===" && ls -la && echo "=== Shared files ===" && ls -la shared/ || echo "No shared directory"

# Build shared first, then server
RUN echo "=== Building shared ===" && cd shared && npm run build && cd ..
RUN echo "=== Building server ===" && cd server && npm run build && cd ..

# Verify build output exists (don't fail, just log)
RUN echo "=== Verifying build output ===" && pwd && ls -la && (ls -la server/dist/ || echo "WARNING: server/dist/ folder not found!")
RUN echo "=== Checking for index.js ===" && (test -f server/dist/index.js && echo "✅ Found server/dist/index.js") || (test -f server/dist/src/index.js && echo "✅ Found server/dist/src/index.js") || (echo "⚠️  index.js not in expected locations. Searching..." && find server/dist -name "index.js" -type f && ls -la server/dist/)
RUN echo "=== Build complete ===" && echo "Index.js will be located at runtime"

# Expose port
EXPOSE 3001

# Start server with debug - try server/dist/index.js first, then server/dist/src/index.js
CMD ["sh", "-c", "pwd && ls -la && ls -la server/dist/ && if [ -f server/dist/index.js ]; then cd server && node dist/index.js; elif [ -f server/dist/src/index.js ]; then cd server && node dist/src/index.js; else echo 'ERROR: index.js not found!' && find server/dist -name 'index.js' && exit 1; fi"]


FROM node:20

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./
COPY shared/package*.json ./shared/

# Install root dependencies
RUN npm install

# Install shared dependencies
RUN cd shared && npm install && cd ..

# Copy all source files
COPY . .

# Build shared first, then server
RUN cd shared && npm run build && cd ..
RUN npm run build

# Verify build output exists
RUN ls -la dist/ || (echo "ERROR: dist/ folder not found!" && exit 1)
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && exit 1)

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]


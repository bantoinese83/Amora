FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install
RUN cd shared && npm install

# Copy source files
COPY . .

# Build
RUN npm run build

# Verify build output
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found after build!" && exit 1)

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]


# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Expose port for backend
EXPOSE 5000

# Start backend
CMD ["node", "app.js"]
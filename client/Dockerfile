# Stage 1: Build the Vite application
FROM node:18-alpine AS build
WORKDIR /app

# Define Build Arguments for Vite compilation
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_URL

# Assign Build Arguments to Environment Variables
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve production assets using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist /var/www/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
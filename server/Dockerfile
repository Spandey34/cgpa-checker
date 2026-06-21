FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
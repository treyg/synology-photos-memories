# Use an ARM-compatible base image
# Note: use docker buildx if you want to build for multiple platforms
FROM --platform=linux/amd64 node:17

WORKDIR /app

COPY package*.json ./

COPY . .

CMD npm install && npm start

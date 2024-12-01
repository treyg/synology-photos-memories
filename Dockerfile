# Use an ARM-compatible base image
# Note: use docker buildx if you want to build for multiple platforms
FROM --platform=linux/amd64 node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]

FROM node:17

WORKDIR /app

COPY package*.json ./

COPY . .

CMD npm install && npm start

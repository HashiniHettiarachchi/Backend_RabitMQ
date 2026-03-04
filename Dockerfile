#Docker file for the node server
FROM node:24-alpine

RUN npm install -g nodemon

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 5000

CMD [ "npm","start" ]


FROM mongo-express:1.0.2-20-alpine3.19

WORKDIR /usr/src/app

COPY . .

RUN yarn install

RUN yarn build

EXPOSE ${PORT}

CMD ["node", "dist/app.js"]

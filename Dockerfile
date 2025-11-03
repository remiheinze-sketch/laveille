FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm ci || npm i
COPY server/.env.example ./.env
COPY server/sql ./sql
COPY server/src ./src
COPY server/config.sample.yml ./config.sample.yml
RUN npm run build
EXPOSE 3000
CMD ["node","dist/server.js"]

FROM node:10.11.0

LABEL maintainer="MacArthur Lab"

WORKDIR /app
COPY package.json /app/
RUN npm install --production
COPY dist /app/dist

CMD ["node", "dist/server.js"]

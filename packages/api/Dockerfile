FROM node:7.5.0

LABEL maintainer="MacArthur Lab"

WORKDIR /var/www
COPY package.json /var/www/
RUN npm install --production
COPY build /var/www/build

CMD ["node", "build/server.js"]

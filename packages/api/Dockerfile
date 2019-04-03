FROM node:10.11.0

LABEL maintainer="MacArthur Lab"

WORKDIR /var/www
COPY package.json /var/www/
RUN npm install --production
COPY build /var/www/build

CMD ["node", "build/server.js"]

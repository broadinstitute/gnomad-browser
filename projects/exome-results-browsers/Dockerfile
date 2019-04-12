FROM node:10.11.0

LABEL maintainer="MacArthur Lab"

ARG BROWSER
WORKDIR /var/www
COPY package.json /var/www/
RUN npm install --production
COPY dist/${BROWSER} /var/www/dist

CMD ["node", "dist/server.js"]

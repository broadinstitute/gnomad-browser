FROM node:7.5.0

MAINTAINER MacArthur Lab

WORKDIR /var/www

COPY package.json /var/www/

RUN npm install --production

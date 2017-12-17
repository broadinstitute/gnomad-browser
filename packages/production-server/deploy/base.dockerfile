FROM node:9.3.0

MAINTAINER MacArthur Lab

COPY . /var/www
WORKDIR /var/www

RUN yarn

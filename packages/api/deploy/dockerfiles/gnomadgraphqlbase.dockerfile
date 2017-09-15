FROM node:7.5.0

MAINTAINER MacArthur Lab

# ENV NODE_ENV=production GRAPHQL_PORT=8000 MONGO_URL=mongodb://localhost:27017/exac

COPY package.json /var/www/

WORKDIR /var/www

# Install development dependencies too
RUN npm install

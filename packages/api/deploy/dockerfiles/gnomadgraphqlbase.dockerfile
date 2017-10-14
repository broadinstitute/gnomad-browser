FROM node:7.5.0

MAINTAINER MacArthur Lab

# ENV NODE_ENV=production GRAPHQL_PORT=8000 MONGO_URL=mongodb://localhost:27017/exac

COPY package.json /var/www/

WORKDIR /var/www

# Install development dependencies too
RUN npm install

# RUN npm run build

COPY lib/utilities/ /var/www/node_modules/@broad/utilities
COPY lib/utilities/ /var/www/node_modules/@broad/utilities
WORKDIR /var/www/node_modules/@broad/utilities
RUN npm install
WORKDIR /var/www

# RUN ls /var/www/node_modules
RUN ls /var/www/node_modules/@broad

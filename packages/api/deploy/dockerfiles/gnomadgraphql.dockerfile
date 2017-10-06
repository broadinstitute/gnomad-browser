FROM gcr.io/exac-gnomad/gnomadgraphqlbase

MAINTAINER MacArthur Lab

# ENV NODE_ENV=production GRAPHQL_PORT=8000 MONGO_URL=mongodb://localhost:27017/exac

COPY . /var/www
WORKDIR /var/www

# RUN npm run build

COPY lib/utilities/ /var/www/node_modules/@broad/utilities
COPY lib/utilities/ /var/www/node_modules/@broad/utilities
WORKDIR /var/www/node_modules/@broad/utilities
RUN npm install
WORKDIR /var/www

# RUN ls /var/www/node_modules
RUN ls /var/www/node_modules/@broad

ENTRYPOINT ["npm"]
CMD ["run", "docker"]

FROM gcr.io/exac-gnomad/gnomadgraphqlbase

MAINTAINER MacArthur Lab

# ENV NODE_ENV=production GRAPHQL_PORT=8000 MONGO_URL=mongodb://localhost:27017/exac

COPY . /var/www
WORKDIR /var/www

ENTRYPOINT ["npm"]
CMD ["run", "docker"]

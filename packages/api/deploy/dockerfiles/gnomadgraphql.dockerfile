FROM gcr.io/exac-gnomad/gnomad-api-base

MAINTAINER MacArthur Lab

COPY build /var/www/build

CMD ["node", "build/server.js"]

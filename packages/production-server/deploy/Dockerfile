FROM gcr.io/exac-gnomad/schema-browser-base

MAINTAINER MacArthur Lab

COPY . /var/www
WORKDIR /var/www

EXPOSE 80

ENTRYPOINT ["yarn"]
CMD ["start-prod"]

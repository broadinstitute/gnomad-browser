FROM node:5.10.0

MAINTAINER Matthew Solomonson

ENV NODE_ENV=production PORT=9000 MONGO_URL=mongodb://localhost:27017/exac

COPY . /var/www
WORKDIR /var/www

RUN npm install --dev \
    && npm run build

EXPOSE 80

ENTRYPOINT ["npm"]
CMD ["run", "prod"]

FROM node:12.18.1-alpine

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json .
COPY --chown=node:node projects/gnomad/package.json projects/gnomad/package.json
COPY --chown=node:node yarn.lock .
RUN yarn install --production false --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node babel.config.js .
COPY --chown=node:node projects/gnomad projects/gnomad

# Build
COPY --chown=node:node projects/gnomad/build.env .
RUN export $(cat build.env | xargs); cd projects/gnomad && yarn run webpack --config=./config/webpack.config.client.js

###############################################################################
FROM nginx:stable-alpine

COPY --from=0 /home/node/app/projects/gnomad/dist/public /usr/share/nginx/html

COPY deploy/dockerfiles/browser/browser-base.nginx.conf /etc/nginx/browser-base.nginx.conf.template
COPY deploy/dockerfiles/browser/browser.nginx.conf /etc/nginx/conf.d/default.conf

CMD envsubst "\$API_URL" < /etc/nginx/browser-base.nginx.conf.template > /etc/nginx/browser-base.nginx.conf && nginx -g "daemon off;"

FROM node:14.15.2-alpine

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json .
COPY --chown=node:node browser/package.json browser/package.json
COPY --chown=node:node yarn.lock .
RUN yarn install --production false --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node babel.config.js .
COPY --chown=node:node browser browser

# Build
COPY --chown=node:node browser/build.env .
RUN export $(cat build.env | xargs); cd browser && yarn run build

###############################################################################
FROM nginx:stable-alpine

# Placeholder value replaced in K8S deployment.
ENV INGRESS_IP=127.0.0.1

COPY --from=0 /home/node/app/browser/dist/public /usr/share/nginx/html

COPY deploy/dockerfiles/browser/browser-base.nginx.conf /etc/nginx/browser-base.nginx.conf.template
COPY deploy/dockerfiles/browser/browser.nginx.conf /etc/nginx/conf.d/default.conf

CMD envsubst "\$API_URL \$INGRESS_IP" < /etc/nginx/browser-base.nginx.conf.template > /etc/nginx/browser-base.nginx.conf && nginx -g "daemon off;"

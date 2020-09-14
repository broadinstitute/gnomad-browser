FROM node:12.18.1-alpine

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json .
COPY --chown=node:node reads/package.json reads/package.json
COPY --chown=node:node yarn.lock .
RUN yarn install --production false --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node babel.config.js .
COPY --chown=node:node reads reads

# Build
RUN cd reads && yarn run webpack

###############################################################################
FROM node:10.11.0

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node reads/package.json .
COPY --chown=node:node yarn.lock .
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy from build stage
COPY --chown=node:node --from=0 /home/node/app/reads/dist ./

# Run
CMD ["node", "server.js"]

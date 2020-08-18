FROM node:12.18.1-alpine

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json .
COPY --chown=node:node projects/gnomad-reads/package.json projects/gnomad-reads/package.json
COPY --chown=node:node yarn.lock .
RUN yarn install --production false --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node babel.config.js .
COPY --chown=node:node projects/gnomad-reads projects/gnomad-reads

# Build
RUN cd projects/gnomad-reads && yarn run webpack

###############################################################################
FROM node:10.11.0

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node projects/gnomad-reads/package.json .
COPY --chown=node:node yarn.lock .
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy from build stage
COPY --chown=node:node --from=0 /home/node/app/projects/gnomad-reads/dist ./

# Run
CMD ["node", "server.js"]

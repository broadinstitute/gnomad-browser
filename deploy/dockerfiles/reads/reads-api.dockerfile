FROM node:10.11.0

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node reads/package.json .
COPY --chown=node:node yarn.lock .
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node reads/src /app/src

# Run
CMD ["node", "src/server.js"]

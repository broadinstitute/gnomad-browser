FROM node:12.18.1-alpine

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node graphql-api/package.json /app/
COPY --chown=node:node yarn.lock .
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node graphql-api/src /app/src

# Run
CMD ["node", "src/app.js"]

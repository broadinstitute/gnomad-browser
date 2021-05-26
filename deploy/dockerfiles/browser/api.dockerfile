FROM node:14.15.2-alpine

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node graphql-api/package.json /app/graphql-api/package.json
COPY --chown=node:node yarn.lock .
RUN echo '{"private": true, "workspaces":["graphql-api"]}' > /app/package.json
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node graphql-api/src /app/graphql-api/src

# Run
CMD ["node", "graphql-api/src/app.js"]

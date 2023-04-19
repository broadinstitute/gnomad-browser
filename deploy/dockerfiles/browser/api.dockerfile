FROM --platform=linux/amd64 node:14.17-alpine

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node dataset-metadata/package.json /app/dataset-metadata/package.json
COPY --chown=node:node graphql-api/package.json /app/graphql-api/package.json
COPY --chown=node:node yarn.lock .
RUN echo '{"private": true, "workspaces":["graphql-api", "dataset-metadata"]}' > /app/package.json
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy source
COPY --chown=node:node dataset-metadata /app/dataset-metadata
COPY --chown=node:node graphql-api/src /app/graphql-api/src
COPY --chown=node:node tsconfig.json /app/graphql-api/tsconfig.json
COPY --chown=node:node tsconfig.build.json /app/graphql-api/tsconfig.build.json

# Build JS from TS source
RUN yarn run tsc -p /app/graphql-api/tsconfig.build.json
CMD ["node", "graphql-api/src/app.js"]

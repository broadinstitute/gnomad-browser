FROM --platform=linux/amd64 node:18.17-alpine
RUN npm install -g pnpm@^8.14.3

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json /app/package.json
COPY --chown=node:node dataset-metadata/package.json /app/dataset-metadata/package.json
COPY --chown=node:node graphql-api/package.json /app/graphql-api/package.json
COPY --chown=node:node pnpm-lock.yaml .
COPY --chown=node:node pnpm-workspace-api-docker.yaml ./pnpm-workspace.yaml
RUN pnpm install --production --frozen-lockfile

# Copy source
COPY --chown=node:node dataset-metadata /app/dataset-metadata
COPY --chown=node:node graphql-api/src /app/graphql-api/src
COPY --chown=node:node browser/src/missingContent.ts /app/browser/src/missingContent.ts
COPY --chown=node:node tsconfig.json /app/tsconfig.json
COPY --chown=node:node tsconfig.build.json /app/tsconfig.build.json

# Build JS from TS source
RUN pnpm tsc -p /app/tsconfig.build.json

# Copy external artifacts and set permissions
COPY --chown=node:node bin/gmd /usr/local/bin/gmd
RUN chmod +x /usr/local/bin/gmd
COPY --chown=node:node resources/gene-disease-table.tsv /app/resources/gene-disease-table.tsv

# Copy static data into place
COPY --chown=node:node graphql-api/static_data /app/static_data

CMD ["node", "graphql-api/src/app.js"]

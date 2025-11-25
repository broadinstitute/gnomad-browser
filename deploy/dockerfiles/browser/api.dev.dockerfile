FROM --platform=linux/amd64 node:18.17-alpine
RUN npm install -g pnpm@^8.14.3

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

# Copy dependency manifests
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node graphql-api/package.json ./graphql-api/
COPY --chown=node:node dataset-metadata/package.json ./dataset-metadata/

# Install all dependencies, including dev dependencies
RUN pnpm install --frozen-lockfile

# Copy external artifacts needed for runtime.
# These are expected to be prepared by `deploy/scripts/prepare-copilotkit-artifacts.sh` before building.
COPY --chown=node:node bin/gmd /usr/local/bin/gmd
RUN chmod +x /usr/local/bin/gmd
COPY --chown=node:node resources/gene-disease-table.tsv /app/resources/gene-disease-table.tsv

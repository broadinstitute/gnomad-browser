FROM node:18.17-alpine@sha256:3482a20c97e401b56ac50ba8920cc7b5b2022bfc6aa7d4e4c231755770cf892f
# pnpm 8.14.3 (npm dist.integrity sha512) is fetched by immutable URL and
# verified before install; registry metadata can no longer select different bytes.
ARG PNPM_TARBALL_URL=https://registry.npmjs.org/pnpm/-/pnpm-8.14.3.tgz
ARG PNPM_TARBALL_SHA512=c3ed80eb583be3e2b7ef31eb96b8b9cfaa0503e5d44ec717514120b5187b2f933736e9038c51a5a23ad582790ba41d4ab784618c89fa7e2365f6665685d612ee
RUN wget -q -O /tmp/pnpm.tgz "$PNPM_TARBALL_URL" \
  && echo "$PNPM_TARBALL_SHA512  /tmp/pnpm.tgz" | sha512sum -c - \
  && npm install -g --offline /tmp/pnpm.tgz \
  && rm /tmp/pnpm.tgz

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
COPY --chown=node:node tsconfig.json /app/graphql-api/tsconfig.json
COPY --chown=node:node tsconfig.build.json /app/graphql-api/tsconfig.build.json

# Build JS from TS source
RUN pnpm tsc -p /app/graphql-api/tsconfig.build.json

# Copy static data and the exact admitted full-genome routing bundle into place.
# Keep this list synchronized with full-genome-routing-artifact-manifest.json;
# do not copy the config directory wholesale.
COPY --chown=node:node graphql-api/static_data /app/static_data
COPY --chown=node:node graphql-api/config/y1-presentation-primary-manifests.json /app/graphql-api/config/y1-presentation-primary-manifests.json
COPY --chown=node:node graphql-api/config/y1-source-phased-methylation-serving-receipt.json /app/graphql-api/config/y1-source-phased-methylation-serving-receipt.json
COPY --chown=node:node graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json /app/graphql-api/config/y1-source-to-browser-vcf-orientation-receipt.json
COPY --chown=node:node graphql-api/config/completion-receipt-coverage-aou.json /app/graphql-api/config/completion-receipt-coverage-aou.json
COPY --chown=node:node graphql-api/config/completion-receipt-coverage-hgsvc_hprc.json /app/graphql-api/config/completion-receipt-coverage-hgsvc_hprc.json
COPY --chown=node:node graphql-api/config/completion-receipt-str-aou.json /app/graphql-api/config/completion-receipt-str-aou.json
COPY --chown=node:node graphql-api/config/completion-receipt-str-hgsvc_hprc.json /app/graphql-api/config/completion-receipt-str-hgsvc_hprc.json
COPY --chown=node:node graphql-api/config/sample-total-completion-receipt.json /app/graphql-api/config/sample-total-completion-receipt.json
COPY --chown=node:node graphql-api/config/terminal-metadata-receipt.json /app/graphql-api/config/terminal-metadata-receipt.json
COPY --chown=node:node graphql-api/config/long-read-tr-reference-crosswalk.json /app/graphql-api/config/long-read-tr-reference-crosswalk.json

CMD ["node", "graphql-api/src/app.js"]

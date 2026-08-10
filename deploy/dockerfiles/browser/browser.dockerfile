# check=skip=JSONArgsRecommended
# The final shell-form CMD intentionally renders nginx config from runtime env.
FROM node:18.17-alpine@sha256:3482a20c97e401b56ac50ba8920cc7b5b2022bfc6aa7d4e4c231755770cf892f AS build
# The browser build uses /bin/sh; no network-selected Alpine packages are installed.
# pnpm 8.14.3 is pinned to its npm dist.integrity SHA-512 before offline install.
ARG PNPM_TARBALL_URL=https://registry.npmjs.org/pnpm/-/pnpm-8.14.3.tgz
ARG PNPM_TARBALL_SHA512=c3ed80eb583be3e2b7ef31eb96b8b9cfaa0503e5d44ec717514120b5187b2f933736e9038c51a5a23ad582790ba41d4ab784618c89fa7e2365f6665685d612ee
RUN wget -q -O /tmp/pnpm.tgz "$PNPM_TARBALL_URL" \
  && echo "$PNPM_TARBALL_SHA512  /tmp/pnpm.tgz" | sha512sum -c - \
  && npm install -g --offline /tmp/pnpm.tgz \
  && rm /tmp/pnpm.tgz

# Browser feature switches are compile-time inputs, not Cloud Run runtime env.
ARG LR_Y1_ENABLED=false
ARG REPORT_VARIANT_URL=
ARG REPORT_VARIANT_VARIANT_ID_PARAMETER=
ARG REPORT_VARIANT_DATASET_PARAMETER=

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

USER node

ENV NODE_ENV=production

# Install dependencies
COPY --chown=node:node package.json .
COPY --chown=node:node pnpm-lock.yaml .
COPY --chown=node:node pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --chown=node:node dataset-metadata/package.json dataset-metadata/package.json
COPY --chown=node:node browser/package.json browser/package.json
RUN pnpm install --production false --frozen-lockfile

# Copy source
COPY --chown=node:node babel.config.js .
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node tsconfig.build.json .
COPY --chown=node:node dataset-metadata dataset-metadata
COPY --chown=node:node browser browser

# Build with the explicit ARG values above available to webpack.
RUN cd browser && pnpm build

# Compress static files for use with nginx's gzip_static
RUN find browser/dist/public -type f | grep -E '\.(css|html|js|json|map|svg|xml)$' \
  | xargs -I{} -n1 sh -c 'gzip -9 -c "$1" > "$1".gz; MTIME=$(date -R -r "$1" +"%Y-%m-%d %H:%M:%S"); touch -d "$MTIME" "$1.gz"' -- {}

###############################################################################
FROM nginx:stable-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46

COPY --from=build /home/node/app/browser/dist/public /usr/share/nginx/html

COPY deploy/dockerfiles/browser/browser.proxy_cache.conf /etc/nginx/browser.proxy_cache.conf
COPY deploy/dockerfiles/browser/browser.nginx.conf /etc/nginx/browser.nginx.conf.template

CMD REAL_IP_CONFIG=$([ -z "${PROXY_IPS:-}" ] || echo "$PROXY_IPS" | awk 'BEGIN { RS="," } { print "set_real_ip_from " $1 ";" }') \
  envsubst "\$API_URL \$REAL_IP_CONFIG" < /etc/nginx/browser.nginx.conf.template > /etc/nginx/conf.d/default.conf && \
  nginx -g "daemon off;"

# Share the Node environment without coupling native builds to API source changes.
# =====
FROM --platform=linux/amd64 node:18.17-alpine AS node-base
RUN npm install -g pnpm@8.14.3

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ENV NODE_ENV=production

FROM node-base AS api-base

# Install dependencies
COPY --chown=node:node package.json /app/package.json
COPY --chown=node:node dataset-metadata/package.json /app/dataset-metadata/package.json
COPY --chown=node:node graphql-api/package.json /app/graphql-api/package.json
COPY --chown=node:node data-store/package.json /app/data-store/package.json
COPY --chown=node:node data-store/index.d.ts /app/data-store/index.d.ts
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

# Copy static data into place
COPY --chown=node:node graphql-api/static_data /app/static_data

CMD ["node", "graphql-api/src/app.js"]

# build the release node addon for Alpine linux
# =====

FROM node-base AS native-builder

USER root

RUN apk add --no-cache \
    build-base \
    ca-certificates \
    clang \
    cmake \
    curl \
    linux-headers \
    lld \
    openssl-dev \
    perl \
    pkgconf

COPY .tool-versions /app/.tool-versions

RUN rust_version="$(awk '$1 == "rust" { print $2 }' /app/.tool-versions)" \
    && test -n "$rust_version" \
    && curl --proto '=https' --tlsv1.2 -fsSL \
        https://sh.rustup.rs \
        -o /tmp/rustup-init.sh \
    && sh /tmp/rustup-init.sh \
        -y \
        --profile minimal \
        --default-toolchain "$rust_version" \
        --no-modify-path \
    && rm /tmp/rustup-init.sh

ENV PATH="/root/.cargo/bin:${PATH}"
# '-crt-static' disables musl (alpine linux's native target)'s default static linking
#     we need to do this to successfully build this shared library
ENV RUSTFLAGS="-C target-feature=-crt-static"
ENV CARGO_BUILD_JOBS=2

COPY package.json pnpm-lock.yaml /app/
COPY pnpm-workspace-api-docker.yaml /app/pnpm-workspace.yaml
COPY data-store/package.json /app/data-store/package.json

RUN CI=true NODE_ENV=development pnpm install \
    --frozen-lockfile \
    --prod=false \
    --filter @gnomad/data-store... \
    && test -x /app/data-store/node_modules/.bin/napi

COPY data-store/Cargo.toml /app/data-store/Cargo.toml
COPY data-store/Cargo.lock /app/data-store/Cargo.lock
COPY data-store/build.rs /app/data-store/build.rs
COPY data-store/index.d.ts /app/data-store/index.d.ts
COPY data-store/src /app/data-store/src

WORKDIR /app/data-store

RUN --mount=type=cache,target=/root/.cargo/registry,sharing=locked \
    --mount=type=cache,target=/root/.cargo/git,sharing=locked \
    --mount=type=cache,target=/app/data-store/target,sharing=locked \
    pnpm exec napi build \
        --platform \
        --release \
        --output-dir bindings \
        -- --locked \
    && cmp index.d.ts bindings/index.d.ts


# include the native addon if passed '--target parquet-api'
# =====

FROM api-base AS parquet-api

USER root

RUN apk add --no-cache \
    libgcc \
    libstdc++ \
    libssl3 \
    libcrypto3

COPY --from=native-builder --chown=node:node \
    /app/data-store/bindings \
    /app/data-store/bindings

USER node

RUN cd /app/graphql-api \
    && node -e "require('@gnomad/data-store')"


# Make default build target not compile/add the rust addon
# =====

FROM api-base AS api

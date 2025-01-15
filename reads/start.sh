#!/bin/sh -eu

cd "$(dirname "$0")"

export NODE_ENV="development"

DEFAULT_PORT="8000"
export PORT=${PORT:-$DEFAULT_PORT}

pnpm nodemon ./src/server.js
#pnpm node -r ts-node/register --inspect ./src/server.js

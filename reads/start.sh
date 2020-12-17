#!/bin/sh -eu

cd "$(dirname "$0")"

export NODE_ENV="development"

DEFAULT_PORT="8000"
export PORT=${PORT:-$DEFAULT_PORT}

yarn run nodemon ./src/server.js

#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export PATH=$PATH:$PROJECT_DIR/../../node_modules/.bin

rm -rf dist

export NODE_ENV=${NODE_ENV:-"production"}
export GNOMAD_API_URL=${GNOMAD_API_URL:-"/api"}

webpack --config=./config/webpack.config.client.js

webpack --config=./config/webpack.config.server.js

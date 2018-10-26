#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export PATH=$PATH:$PROJECT_DIR/node_modules/.bin

export NODE_ENV="development"
export GNOMAD_API_URL=${GNOMAD_API_URL:-"http://gnomad-api.broadinstitute.org"}

webpack-dev-server --config=./config/webpack.config.client.js --hot

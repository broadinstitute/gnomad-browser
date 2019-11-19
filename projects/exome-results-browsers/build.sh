#!/bin/bash

set -eu

if [ $# -lt 1 ]; then
  echo "Usage: build.sh browser" 1>&2
  exit 1
fi

BROWSER=$1

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

# Validate browser argument
if [[ ! -d ./browsers/${BROWSER} ]]; then
  echo "configuration for ${BROWSER} does not exist" 1>&2
  exit 1
fi

export NODE_ENV="production"
export BROWSER=$BROWSER

rm -rf dist

yarn run webpack --config=./config/webpack.config.client.js

yarn run webpack --config=./config/webpack.config.server.js

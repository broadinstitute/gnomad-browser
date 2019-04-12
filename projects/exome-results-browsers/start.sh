#!/bin/bash

set -eu

if [ $# -lt 1 ]; then
  echo "Usage: start.sh browser [port]" 1>&2
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

export PATH=$PATH:$PROJECT_DIR/../../node_modules/.bin

export NODE_ENV="development"
export BROWSER=$BROWSER

# Connect to local databases
DEFAULT_ELASTICSEARCH_URL="http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy"
DEFAULT_MONGO_URL="mongodb://localhost:27017/exac"
export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-$DEFAULT_ELASTICSEARCH_URL}
export MONGO_URL=${MONGO_URL:-$DEFAULT_MONGO_URL}

DEFAULT_PORT=8000
WEBPACK_DEV_SERVER_PORT=${2:-$DEFAULT_PORT}
export PORT=$(expr $WEBPACK_DEV_SERVER_PORT + 10)

rm -rf "dist/${BROWSER}"

# Bundle server once before starting nodemon
webpack --config=./config/webpack.config.server.js --display=errors-only

webpack-dev-server --config=./config/webpack.config.client.js --hot --port $WEBPACK_DEV_SERVER_PORT &
PID[0]=$!

webpack --config=./config/webpack.config.server.js --display=errors-only --watch &
PID[1]=$!

nodemon dist/${BROWSER}/server.js &
PID[2]=$!

trap "kill ${PID[0]} ${PID[1]} ${PID[2]}; exit 1" INT

wait

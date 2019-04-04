#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export PATH=$PATH:$PROJECT_DIR/../../node_modules/.bin

export NODE_ENV="development"

# Connect to local databases
DEFAULT_ELASTICSEARCH_URL="http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy"
DEFAULT_MONGO_URL="mongodb://localhost:27017/exac"
DEFAULT_REDIS_HOST="localhost"
export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-$DEFAULT_ELASTICSEARCH_URL}
export GNOMAD_MONGO_URL=${MONGO_URL:-$DEFAULT_MONGO_URL}
export REDIS_HOST=${REDIS_HOST:-$DEFAULT_REDIS_HOST}

# Server port
export GRAPHQL_PORT=8007

rm -rf dist

# Bundle server once before starting nodemon
webpack --display=errors-only

webpack --display=errors-only --watch &
PID[0]=$!

nodemon dist/server.js &
PID[1]=$!

trap "kill ${PID[0]} ${PID[1]}; exit 1" INT

wait

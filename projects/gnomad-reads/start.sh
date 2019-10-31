#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export NODE_ENV="development"

export PORT=${PORT:-"8000"}

rm -rf dist

# Bundle server once before starting nodemon
yarn run webpack --display=errors-only

yarn run webpack --display=errors-only --watch &
PID[0]=$!

yarn run nodemon dist/server.js &
PID[1]=$!

trap "kill ${PID[0]} ${PID[1]}; exit 1" INT

wait

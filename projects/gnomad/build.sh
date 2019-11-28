#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

rm -rf dist

export NODE_ENV=${NODE_ENV:-"production"}

yarn run webpack --config=./config/webpack.config.client.js

yarn run webpack --config=./config/webpack.config.server.js

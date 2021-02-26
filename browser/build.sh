#!/bin/sh

set -eu

PROJECT_DIR=$(dirname "$0")
cd $PROJECT_DIR

./build/buildFAQ.js
./build/buildHelp.js

yarn run webpack

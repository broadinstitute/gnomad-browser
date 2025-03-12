#!/bin/sh -eu

cd "$(dirname "$0")"

export NODE_ENV="development"

DEFAULT_PORT="8000"
export PORT=${PORT:-$DEFAULT_PORT}

if [[ -n ${DEBUG:-""} ]]; then
	# Invoking Node with these flags allows us to attach the interactive
	# debugger for Node that's built into Chrome.
	pnpm node -r ts-node/register --inspect ./src/server.js
else
	pnpm nodemon ./src/server.js
fi

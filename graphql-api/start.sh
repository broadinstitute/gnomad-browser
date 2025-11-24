#!/bin/sh -eu

export NODE_ENV=development

DEFAULT_PORT="8010"
export PORT="${PORT:-$DEFAULT_PORT}"

DEFAULT_ELASTICSEARCH_URL="http://localhost:9200"
export ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-$DEFAULT_ELASTICSEARCH_URL}"

DEFAULT_REDIS_HOST="localhost"
export REDIS_HOST="${REDIS_HOST:-$DEFAULT_REDIS_HOST}"

DEFAULT_REDIS_PORT="6379"
export REDIS_PORT="${REDIS_PORT:-$DEFAULT_REDIS_PORT}"

# CopilotKit environment configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/src/copilotkit/env.sh" ]; then
    source "${SCRIPT_DIR}/src/copilotkit/env.sh"
fi

if [[ -n ${DEBUG:-""} ]]; then
	# Invoking Node with these flags allows us to attach the interactive
	# debugger for Node that's built into Chrome.
	pnpm node -r ts-node/register --inspect ./src/app.ts
else
	pnpm ts-node ./src/app.ts
fi

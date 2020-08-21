#!/bin/sh -eu

export NODE_ENV=development

DEFAULT_PORT="8010"
export PORT="${PORT:-$DEFAULT_PORT}"

DEFAULT_INTERNAL_API_URL="http://localhost:8011"
export INTERNAL_API_URL="${INTERNAL_API_URL:-$DEFAULT_INTERNAL_API_URL}"

DEFAULT_CACHE_REDIS_URL="redis://localhost:6379/1"
export CACHE_REDIS_URL="${CACHE_REDIS_URL:-$DEFAULT_CACHE_REDIS_URL}"

DEFAULT_RATE_LIMITER_REDIS_URL="redis://localhost:6379/2"
export RATE_LIMITER_REDIS_URL="${RATE_LIMITER_REDIS_URL:-$DEFAULT_RATE_LIMITER_REDIS_URL}"

# Wait for internal API to be ready
until curl -s "${INTERNAL_API_URL}/health/ready" >/dev/null; do sleep 2; done

yarn run nodemon ./src/app.js

#!/bin/sh -eu

if [ -z "${DATA_DIRECTORY:-}" ]; then
  echo "Missing required environment variable: DATA_DIRECTORY" 1>&2
  exit 1
fi

export COLLECT_TEMP_DIR="$(dirname "$0")/tmp"
mkdir -p "$COLLECT_TEMP_DIR"
echo '*' > "${COLLECT_TEMP_DIR}/.gitignore"

export PYTHONPATH="$(dirname "0")/src:${PYTHONPATH:-}"

python3 -m aiohttp.web --port 8011 gnomad_api.app:init_app

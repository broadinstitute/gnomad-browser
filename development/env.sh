#!/bin/sh -eu

script_dir=$(dirname "$0")
cd "$script_dir/.."

with_api=""
with_browser=""

while [ $# -ne 0 ]; do
  arg="$1"
  case "$arg" in
    api)
      with_api=true
      shift
      ;;
    browser)
      with_browser=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [ -z $with_api ] && [ -z $with_browser ]; then
  with_api=true
  with_browser=true
fi

compose_config=""
if [ $with_api ]; then
  compose_config="$compose_config --file=development/api.docker-compose.yaml"

  PROJECT=$(./deployctl config get project)
  ZONE=$(./deployctl config get zone)
  ELASTICSEARCH_PASSWORD=$(./deployctl elasticsearch get-password)

  export PROJECT
  export ZONE
  export ELASTICSEARCH_PASSWORD
fi

if [ $with_browser ]; then
  compose_config="$compose_config --file=development/browser.docker-compose.yaml"

  export GNOMAD_API_URL="https://gnomad.broadinstitute.org/api"
  export READS_API_URL="https://gnomad.broadinstitute.org/reads"

  if [ $with_api ]; then
    export GNOMAD_API_URL="http://api:8000/api"
  fi
fi

docker compose --project-directory="$(pwd)" $compose_config "$@"

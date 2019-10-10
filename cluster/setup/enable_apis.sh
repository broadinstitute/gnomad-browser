#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"


function enable_api () {
    SERVICE=$1
    if [[ $(gcloud --project "$PROJECT" services list --filter="config.name:$SERVICE" --format="value(config.name)" 2>&1) != "$SERVICE" ]]; then
        echo "Enabling $SERVICE"
        gcloud --project "$PROJECT" services enable "$SERVICE"
    else
        echo "$SERVICE is already enabled"
    fi
}


enable_api container.googleapis.com
enable_api iam.googleapis.com

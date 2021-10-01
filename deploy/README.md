# Deployment

## Requirements

- Google Cloud SDK

  Instructions for installing and initializing the Google Cloud SDK are available at https://cloud.google.com/sdk/.

- Docker

  Instructions for installing Docker are available at https://docs.docker.com/get-docker/.

  To allow pushing images to GCR, register `gcloud` as a Docker credential helper with `gcloud auth configure-docker`.

- Python dependencies

  `pip install -r deploy/deployctl/requirements.txt`

## Configuration

Select a GCP project and zone to use.

```
./deployctl config set project $PROJECT
./deployctl config set zone $ZONE
./deployctl config set domain $DOMAIN
```

To see other available configuration options, run `./deployctl config list`.

## Table of contents

- [Creating a new deployment](./docs/NewDeployment.md)
- [Updating an existing deployment](./docs/UpdateDeployment.md)
- Elasticsearch
  - [Connecting to Elasticsearch](./docs/ElasticsearchConnection.md)
  - [Index aliases](./docs/ElasticsearchIndexAliases.md)
  - [Backups](./docs/ElasticsearchSnapshots.md)
  - [Loading large datasets](./docs/LoadingLargeDatasets.md)
- [Redis cache](./docs/RedisCache.md)
- [Logging](./docs/Logging.md)

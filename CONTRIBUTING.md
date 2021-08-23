# Contributing

## Setting up a development environment

- Install [Docker](https://www.docker.com/).

- Install development dependencies.

  ```
  pip install requirements-dev.txt
  ```

- Install and configure [git-secrets](https://github.com/awslabs/git-secrets).

- Install [pre-commit](https://pre-commit.com/) hooks.

  ```
  python3 -m pre_commit install
  ```

## Browser

The production API can be used for browser development. To start a local instance of only the browser, use:

```
./development/env.sh browser up
```

## API

Because of the size of the gnomAD database, API development is usually done using an Elasticsearch cluster hosted in the cloud. See the [deployment documentation](./deploy/README.md) for instructions on deploying a browser environment in GCP and the [data pipeline documentation](./data-pipeline/README.md) for instructions on populating the database.

- Install and configure the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).

- Select GCP project and zone for development deployment.

  ```
  ./deployctl config set project $PROJECT
  ./deployctl config set zone $ZONE
  ```

- Start a local instance of the API and browser.

  ```
  ./development/env.sh up
  ```

  The [Docker Compose configuration](development/api.docker-compose.yaml) could be modified to run Elasticsearch locally.

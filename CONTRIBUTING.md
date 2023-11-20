# Contributing

See [development/docs](./development/docs) for more information.

## Setting up a development environment

- Install [Docker](https://www.docker.com/)

- Install and configure [git-secrets](https://github.com/awslabs/git-secrets).

- Install [pre-commit](https://pre-commit.com/) and configure hooks.

  ```
  pre-commit install
  ```

This should be enough to use the Docker Compose development environment. However, installing dependencies may be required if not using Docker Compose or for some editor integrations.

- For browser/API development, install [Node.js](https://nodejs.org/), [Yarn (v1)](https://classic.yarnpkg.com/), and dependencies.

  ```
  yarn
  ```

- For data pipeline development, install [Python](https://www.python.org/), dependencies, and development tools.

  ```
  pip install -r data-pipeline/requirements.txt
  pip install -r requirements-dev.txt
  pip install -r deploy/deployctl/requirements.txt
  ```

## Browser

The production API can be used for browser development. To start a local instance of only the browser...

- with Docker

  ```
  # create browser/build.env file
  cat <<EOF > browser/build.env
  GA_TRACKING_ID=
  REPORT_VARIANT_URL=
  REPORT_VARIANT_VARIANT_ID_PARAMETER=
  REPORT_VARIANT_DATASET_PARAMETER=
  EOF

  ./development/env.sh browser up
  ```

- without Docker:

  ```
  cd browser
  ./start.sh
  ```

## API

Because of the size of the gnomAD database, API development is usually done using an Elasticsearch cluster hosted in the cloud. See the [deployment documentation](./deploy/README.md) for instructions on deploying a browser environment in GCP and the [data pipeline documentation](./data-pipeline/README.md) for instructions on populating the database.

- Install and configure the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).

- Select GCP project and zone for development deployment.

  ```
  ./deployctl config set project $PROJECT
  ./deployctl config set zone $ZONE
  ```

- Start a local instance of the API...

  - with Docker:

    ```
    ./development/env.sh api up
    ```

    or use `./development/env.sh up` to start both the API and browser

  - without Docker:

    ```
    cd graphql-api
    ELASTICSEARCH_USERNAME=elastic ELASTICSEARCH_PASSWORD=$(../deployctl elasticsearch get-password) ./start.sh
    ```

The [Docker Compose configuration](development/api.docker-compose.yaml) could be modified to run Elasticsearch locally.

## Data pipeline

See [data-pipeline/README.md](./data-pipeline/README.md).

## Conventions

All code should formatted using either [Prettier](https://prettier.io/) for JavaScript or [Black](https://black.readthedocs.io/) for Python. To run these formatters, use:

- Prettier: `yarn run format`
- Black: `black .`

If pre-commit hooks are installed, formatters will be automatically run on each commit.

Some other conventions are enforced using [ESLint](https://eslint.org/) for JavaScript, [Stylelint](https://stylelint.io/) for CSS (and styled-components styles), and [Pylint](https://pylint.org/) for Python. To run these linters use:

- ESLint: `yarn run lint:js`
- Stylelint: `yarn run lint:css`
- Pylint: `pylint data-pipeline/src/data_pipeline`

## Tests

[Jest](https://jestjs.io/) is used for JavaScript unit tests. Jest is configured to look for files named `*.spec.js` in the browser and graphql-api directories.

To run all tests, use:

```
yarn test
```

To run only tests for one component, use `yarn test --projects browser` or `yarn test --projects graphql-api`.

## Updating dependencies

Images for the Docker Compose development environment need to be rebuilt after updating dependencies.

```
./development/env.sh build browser
./development/env.sh build api
```

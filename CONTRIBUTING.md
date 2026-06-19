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

- For browser/API development, install [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), and dependencies.

  ```
  pnpm install
  ```

- For data pipeline development, install [uv](https://docs.astral.sh/uv/) and sync the
  data-pipeline dependencies. uv reads the pinned Python version and dependencies from
  `data-pipeline/pyproject.toml`/`data-pipeline/uv.lock`, installing them into
  `data-pipeline/.venv`.

  ```
  cd data-pipeline && uv sync --frozen
  ```

  Run pipeline tools through uv, e.g. `uv run pytest` or `uv run ruff check src/data_pipeline`.

- For the remaining Python tooling (linters and deploy scripts), install dependencies with pip.

  ```
  pip install -r requirements-dev.txt
  pip install -r deploy/deployctl/requirements.txt
  ```

## Frontend

The production API can be used for browser development. To start a local instance of only the browser...

To start a local instance of the frontend, use `pnpm start:browser`. Set the `GNOMAD_API_URL` to quickly change then URL where the local frontend makes API requests to

- Start a local instance of the frontend, pointing to the production API

  ```
  GNOMAD_API_URL=https://gnomad.broadinstitute.org/api pnpm start:browser
  ```

- Start a local instance of the frontend, pointing to a local API (see below to start a local API)

  ```
  GNOMAD_API_URL=http://localhost:8010/api pnpm start:browser
  ```

## API

Because of the size of the gnomAD database, API development is usually done using the production Elasticsearch cluster hosted in the cloud. See the [deployment documentation](./deploy/README.md) for instructions on deploying a browser environment in GCP and the [data pipeline documentation](./data-pipeline/README.md) for instructions on populating the database.

- Install and configure the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).

- Select GCP project and zone for development deployment.

  ```
  ./deployctl config set project $PROJECT
  ./deployctl config set zone $ZONE
  ```

- Start a local instance of the API...

  - Get the `ELASTICSEARCH_PASSWORD` secret to be used for requests;

    ```
    ELASTICSEARCH_PASSWORD=$(./deployctl elasticsearch get-password)
    ```

  - Start the local API:

    ```
    cd graphql-api
    ELASTICSEARCH_USERNAME=elastic ELASTICSEARCH_PASSWORD=$(../deployctl elasticsearch get-password) ./start.sh
    ```

## Data pipeline

See [data-pipeline/README.md](./data-pipeline/README.md).

## Conventions

All code should formatted using either [Prettier](https://prettier.io/) for JavaScript or [Ruff](https://docs.astral.sh/ruff/formatter/) for Python. To run these formatters, use:

- Prettier: `pnpm format`
- Ruff: `ruff format .`

If pre-commit hooks are installed, formatters will be automatically run on each commit.

Some other conventions are enforced using [ESLint](https://eslint.org/) for JavaScript, [Stylelint](https://stylelint.io/) for CSS (and styled-components styles), and [Pylint](https://pylint.org/) for Python. To run these linters use:

- ESLint: `pnpm lint:js`
- Stylelint: `pnpm lint:css`
- Pylint: `pylint data-pipeline/src/data_pipeline`

## Tests

- [Jest](https://jestjs.io/) is used for JavaScript unit tests. Jest is configured to look for files named `*.spec.js` in the browser and graphql-api directories.

  - To run all Jest tests, use:

    ```
    pnpm jest
    ```

  - To run only tests for one component, use `pnpm jest --projects browser` or `pnpm jest --projects graphql-api`.

- [Playwright](https://playwright.dev) is used for a set of minimal e2e tests as a sanity check before promoting off color deployments to production.

  - To run the playwright tests, use:

    ```
    GNOMAD_API_URL=<YOUR_URL>/api pnpm start:browser
    ```

    e.g., to run the tests against a locally running development backend:

    ```
    GNOMAD_API_URL=http://localhost:8010/api pnpm start:browser
    ```

    - To run the playwright tests against a new `green` deployment, get the IP associated with the ingress

      ```
      GNOMAD_API_URL="http://$(kubectl get ingress gnomad-ingress-demo-green -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/api" pnpm test:playwright
      ```

    - For `blue`:

      ```
      GNOMAD_API_URL="http://$(kubectl get ingress gnomad-ingress-demo-blue -o jsonpath='{.status.loadBalancer.ingress[0].ip}')/api" pnpm test:playwright
      ```

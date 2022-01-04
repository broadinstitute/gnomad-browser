# Code organization

# browser

Browser UI

- about

  Information about the gnomAD project and browser (contributors, terms of use, etc).

  Stored in Markdown for easy updates and converted to HTML in the browser build.

- build

  Browser build scripts.

- help

  Content for help/FAQ pages.

  Stored in Markdown for easy updates and converted to HTML in the browser build.

- src

  UI components.

# data-pipeline

Data pipeline

- caids

  Scripts related to fetching CAIDs from the ClinGen Allele Registry.

- src/data_pipeline

  Main data pipelines.

# dataset-metadata

Metadata about gnomAD datasets shared between the browser and API.

# deploy

Scripts and configuration for browser deployment.

- deployctl

  Code for `deployctl` tool.

- dockerfiles

  Dockerfiles for all components.

- manifests

  K8S manifests for all components.

# development

Development environment, docs, and scripts.

# graphql-api

GraphQL API

- src

  - graphql

    - resolvers

      GraphQL resolvers connecting functions in `src/queries` to GraphQL.

    - types

      GraphQL schema definitions.

  - queries

    Elasticsearch queries and any necessary data transformation.

# reads

Read data API and scripts.

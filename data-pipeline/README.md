# gnomAD Browser Data Pipeline

## Requirements

- [Google Cloud SDK](https://cloud.google.com/sdk/)

  See https://cloud.google.com/sdk/docs/quickstarts for instructions on installing and initializing the Google Cloud SDK.

- [Hail](https://hail.is/)

  See https://hail.is/docs/0.2/getting_started.html for instructions on installing Hail.

  For running pipelines on a Dataproc cluster, only `hailctl` is required.

## Running a pipeline

### Running a pipeline on a Dataproc cluster

- Configure pipeline.

  Project and zone settings are used for Dataproc clusters.

  Staging path specifies the destination for intermediate Hail Tables.

  ```
  ./pipelinectl config set project <project-id>
  ./pipelinectl config set zone <zone>
  ./pipelinectl config set staging_path <gs://bucket/path/to/staging/directory>
  ```

- Start a cluster.

  ```
  ./pipelinectl cluster start <cluster-name>
  ```

- Run a pipeline.

  A list of all pipelines can be seen with `./pipelinectl run --help`.

  ```
  ./pipelinectl run --cluster <cluster-name> <pipeline> <pipeline-args>
  ```

- Stop cluster.

  Clusters created with `pipelinectl cluster start` are configured with a max idle time and will automatically stop.

  ```
  ./pipelinectl cluster stop <cluster-name>
  ```

## Pipelines

Data preparation for the gnomAD browser is split into multiple pipelines:

- gene_models
- coverage
- clinvar_variants
- gnomad_v3_variants
- gnomad_v2_variants
- exac_variants
- rsids

The gene_models pipeline must be run first. The rsids pipeline must be run after variant pipelines.
The others can be run in any order.

The clinvar_variants pipeline must be run twice, once for GRCh37 and once for GRCh38. It also requires a cluster
with VEP installed and configured for the appropriate reference genome.

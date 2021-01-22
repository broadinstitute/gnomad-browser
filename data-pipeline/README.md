# gnomAD Browser Data Pipeline

## Requirements

- [Google Cloud SDK](https://cloud.google.com/sdk/)

  See https://cloud.google.com/sdk/docs/quickstarts for instructions on installing and initializing the Google Cloud SDK.

- [Hail](https://hail.is/)

  See https://hail.is/docs/0.2/getting_started.html for instructions on installing Hail.

## Data preparation

Data preparation for the gnomAD browser is split into multiple pipelines:

- genes
- clinvar_grch37
- clinvar_grch38
- exac
- gnomad_v2
- gnomad_sv_v2
- gnomad_v3

The genes pipeline must be run first. The others can be run in any order.

The genes pipeline shuffles a lot and thus should not be run on clusters with preemptible workers.

The ClinVar pipelines must be run on clusters with an appropriate version of VEP installed.

### Running a pipeline on a Dataproc cluster

- Configure pipeline.

  Project and zone settings are used for Dataproc clusters.

  Staging path specifies the destination for intermediate Hail Tables.

  ```
  ./deployctl config set project <project-id>
  ./deployctl config set zone <zone>
  ./deployctl config set data_pipeline_output <gs://bucket/path/to/staging/directory>
  ```

- Start a cluster.

  ```
  ./deployctl dataproc-cluster start <cluster-name>
  ```

- Run a pipeline.

  A list of all pipelines can be seen with `./deployctl data-pipeline run --help`.

  ```
  ./deployctl data-pipeline run --cluster <cluster-name> <pipeline> -- <pipeline-args>
  ```

- Stop cluster.

  Clusters created with `deployctl dataproc-cluster start` are configured with a max idle time and will automatically stop.

  ```
  ./deployctl dataproc-cluster stop <cluster-name>
  ```

### ClinVar variant pipelines

The ClinVar variant pipelines run VEP and thus must be run on clusters with an appropriate version of VEP installed.

* To match gnomAD v2.1, GRCh37 ClinVar variants should be annotated with VEP 85. To start a cluster with VEP 85 installed, use:

  ```
  ./deployctl dataproc-cluster start vep85 --vep GRCh37
  ```

* To match gnomAD v3.1, GRCh38 ClinVar variants should be annotated with VEP 101. To start a cluster with VEP 101 installed, use:

  ```
  ./deployctl dataproc-cluster start vep101 \
    --init=gs://gnomad-browser-data-pipeline/init-vep101.sh \
    --metadata=VEP_CONFIG_PATH=/vep_data/vep-gcloud.json,VEP_CONFIG_URI=file:///vep_data/vep-gcloud.json,VEP_REPLICATE=us \
    --master-machine-type n1-highmem-8 \
    --worker-machine-type n1-highmem-8 \
    --worker-boot-disk-size=200 \
    --secondary-worker-boot-disk-size=200
  ```

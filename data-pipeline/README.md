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
- exac_coverage
- exac_variants
- gnomad_v2_coverage
- gnomad_v2_variants
- gnomad_v2_lof_curation_results
- gnomad_v2_variant_cooccurrence
- liftover
- gnomad_sv_v2
- gnomad_v3_coverage
- gnomad_v3_variants
- gnomad_v3_local_ancestry
- gnomad_v3_mitochondrial_coverage
- gnomad_v3_mitochondrial_variants

The genes pipeline must be run first. The others can be run in any order.
Within a dataset, the coverage pipeline needs to be run before the variants pipeline.

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

  NOTE: Starting with `gnomad version 4.1`, it is highly recommended to specify a
  custom OS image that was built for that gnomAD version. To see these images, run
  `gcloud compute images list --filter="family=dataproc-custom-image"`. You can then
  pass the desired image name to the above `start` command using the `--image` flag.

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
See [deploy/docs/UpdateClinvarVariants.md](../deploy/docs/UpdateClinvarVariants.md)

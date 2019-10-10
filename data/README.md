# Data for gnomAD browser

This directory contains scripts for populating the gnomAD browser's databases.

Many scripts, especially for the larger datasets such as gnomAD variants, use
[Hail](https://hail.is/). The instructions provided here run those scripts on
[Google Cloud Dataproc](https://cloud.google.com/dataproc/). For other platforms,
refer to [Hail's documentation](https://hail.is/docs/0.2/getting_started.html#installation).

For several datasets, the process is broken down into separate preparation and
loading steps. The preparation step formats a dataset for the browser, adds
derived fields, and outputs a Hail table. The loading step then uploads that
Hail table to an Elasticsearch cluster. Dividing the process like this allows
for the preparation step to be run on a large Spark cluster using preemptible
workers. The `export_ht_to_es.py` script should not be run on a cluster with
preemptible workers. Doing so may result in duplicate data in Elasticsearch if
a worker is interrupted during a bulk request.

## Reference data

* [gene models](./docs/gene_models.md)
* GTEx tissue expression
* ClinVar variants

## gnomAD 3.0

* [variants](./docs/gnomad_r3/variants.md)
* [coverage](./docs/gnomad_r3/coverage.md)
* [site quality metric distributions](./docs/gnomad_r3/site_quality_metric_distributions.md)

## gnomAD 2.1.1

* [variants](./docs/gnomad_r2_1/variants.md)
* [coverage](./docs/gnomad_r2_1/coverage.md)
* [site quality metric distributions](./docs/gnomad_r2_1/site_quality_metric_distributions.md)
* [constraint](./docs/gnomad_r2_1/constraint.md)
* [multi-nucleotide variants](./docs/gnomad_r2_1/mnvs.md)
* pext scores

## gnomAD SVs

* [structural variants](./docs/gnomad_sv/sv.md)

## ExAC

* [variants](./docs/exac/variants.md)
* [constraint](./docs/exac/constraint.md)
* [regional missense constraint](./docs/exac/regional_missense_constraint.md)

# Epi25

## Gene results

1. Start a cluster.
   ```shell
   cluster start --max-idle=30m --packages=elasticsearch epi25-data
   ```

2. Prepare gene results.
   ```shell
   cluster submit epi25-data ./projects/exome-results-browsers/browsers/epi25/data/prepare_gene_results.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--input-url=gs://epi-browser/2018-11-07_epi25-exome-browser-gene-results-table-reduced.csv \
         --output-url=gs://epi-browser/2018-11-07_gene_results.ht"
   ```

3. Load table into Elasticsearch. Replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   cluster submit epi25-data ./projects/gnomad/data/export_ht_to_es.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--ht-url=gs://epi-browser/2018-11-07_gene_results.ht \
         --host=$ELASTICSEARCH_IP \
         --index-name=epi25_gene_results_2018_11_07 \
         --index-type=result \
         --num-shards=2"
   ```

4. Stop cluster.
   ```shell
   cluster stop epi25-data
   ```

## Variant results

1. Start a cluster with Hail 0.1.
   ```shell
   cluster start \
      --max-idle=30m \
      --packages=elasticsearch \
      --version=0.1 \
      --zone=$GCLOUD_ZONE \
      epi25-data
   ```
   Note: If Elasticsearch is exposed through an internal load balancer, be sure to create the Dataproc
   cluster in the same GCP zone as the Elasticsearch cluster.

2. Zip the contents of the hail-elasticsearch-pipelines submodule.
   This repository contains helper functions used in the following Hail scripts.
   ```shell
   cd hail-elasticsearch-pipelines
   zip -r hail_scripts.zip hail_scripts
   ```

3. Submit variant results loading script.
   ```shell
   gcloud dataproc jobs submit pyspark \
      --cluster=epi25-data \
      --py-files=./hail-elasticsearch-pipelines/hail_scripts.zip \
      ./projects/exome-results/browsers/epi25/load_variant_results.py -- \
         --host=$ELASTICSEARCH_IP \
         --index=epi25_variant_results_2018_11_27
   ```

4. Stop cluster.
   ```shell
   cluster stop epi25-data
   ```

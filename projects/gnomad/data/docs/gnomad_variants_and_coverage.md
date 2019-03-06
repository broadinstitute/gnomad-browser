# gnomAD variants and coverage

## Prepare data

1. Create a Dataproc cluster.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      gnomad-data-prep 2 98
   ```

2. Prepare gnomAD exome variants.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_gnomad_r2_1_for_browser.py \
         --input-url=gs://gnomad/release/2.1.1/ht/gnomad.exomes.r2.1.1.flat.with_subsets.sites.ht \
         --output-url=$GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL
   ```
 
3. Prepare gnomAD genome variants.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_gnomad_r2_1_for_browser.py \
         --input-url=gs://gnomad/release/2.1.1/ht/gnomad.genomes.r2.1.1.flat.with_subsets.sites.ht \
         --output-url=$GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL
   ```

4. Prepare gnomAD exome coverage.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_coverage_summary_for_browser.py \
         --input-url=gs://gnomad/coverage/hail-0.2/coverage/exomes/ht/gnomad.exomes.coverage.summary.ht \
         --output-url=$GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL
   ```

5. Prepare gnomAD genome coverage.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_coverage_summary_for_browser.py \
         --input-url=gs://gnomad/coverage/hail-0.2/coverage/genomes/ht/gnomad.genomes.coverage.summary.ht \
         --output-url=$GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL
   ```

## Load data

6. Create a Dataproc cluster with no preemptible workers.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      gnomad-data-load 8
   ```

7. Load gnomAD exome variants into Elasticsearch. Use the `$GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL`
   from step 2 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-load \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_exomes_2_1_1 \
         --index-type=variant \
         --num-shards=12
   ```

8. Load gnomAD genome variants into Elasticsearch. Use the `$GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL`
   from step 3 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-load \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_genomes_2_1_1 \
         --index-type=variant \
         --num-shards=12
   ```

9. Load gnomAD exome coverage into Elasticsearch. Use the `$GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL`
   from step 4 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-data-load \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_exome_coverage_2_1 \
         --index-type=position \
         --num-shards=12
   ```

10. Load gnomAD genome coverage into Elasticsearch. Use the `$GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL`
    from step 5 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
    ```shell
    ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
       --cluster=gnomad-data-load \
       --hail-version=0.2 \
       ./projects/gnomad/data/export_ht_to_es.py \
          --ht-url=$GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL \
          --host=$ELASTICSEARCH_IP \
          --index-name=gnomad_genome_coverage_2_1 \
          --index-type=position \
          --num-shards=12
    ```

11. Delete the Dataproc cluster.
    ```shell
    ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py gnomad-data-load
    ```

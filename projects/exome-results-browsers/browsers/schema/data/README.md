# SCHEMA

1. Start a cluster.

   ```
   hailctl dataproc start schema \
      --max-idle 30m \
      --num-preemptible-workers 24 \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare gene results.

   ```
   hailctl dataproc submit schema \
      ./projects/exome-results-browsers/browsers/schema/data/prepare_gene_results.py \
         gs://schizophrenia-browser/191010/2019-10-10_schema-browser-gene-results-table.ht \
         gs://schizophrenia-browser/191010/gene_results.ht
   ```

3. Prepare variant results.

   ```
   hailctl dataproc submit schema \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      ./projects/exome-results-browsers/browsers/schema/data/prepare_variant_results.py \
         --variant-annotations-url=gs://schizophrenia-browser/190415/2019-04-15_schema-browser-variant-annotation-table.ht \
         --variant-results-url=gs://schizophrenia-browser/190415/2019-04-15_schema-browser-variant-results-table-meta-rare-denovos-common-merged.ht \
         --output-url=gs://schizophrenia-browser/190415/variant_results.ht
   ```

4. Modify the cluster to remove preemptible workers.

   ```
   hailctl dataproc modify schema \
      --num-preemptible-workers 0
   ```

5. Load tables into Elasticsearch. Replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```
   hailctl dataproc submit schema \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         gs://schizophrenia-browser/191010/gene_results.ht \
         $ELASTICSEARCH_IP \
         schema_gene_results_2019_10_10 \
         --num-shards 2

   hailctl dataproc submit schema \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         gs://schizophrenia-browser/190415/variant_results.ht \
         $ELASTICSEARCH_IP \
         schema_variant_results_2019_04_15 \
         --num-shards 2
   ```

6. Stop cluster.

   ```
   hailctl dataproc stop schema
   ```

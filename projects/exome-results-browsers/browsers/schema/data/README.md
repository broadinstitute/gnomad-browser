# SCHEMA

1. Start a cluster.
   ```
   cluster start --max-idle=30m --num-preemptible-workers=24 schema-data-prep
   ```

2. Prepare gene results.
   ```
   cluster submit schema-data-prep ./projects/exome-results-browsers/browsers/schema/data/prepare_gene_results.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--input-url=gs://schizophrenia-browser/190415/2019-04-11_schema-browser-gene-results-table.ht \
         --output-url=gs://schizophrenia-browser/190415/gene_results.ht"
   ```

3. Prepare variant results.
   ```
   cluster submit schema-data-prep ./projects/exome-results-browsers/browsers/schema/data/prepare_variant_results.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--variant-annotations-url=gs://schizophrenia-browser/190415/2019-04-15_schema-browser-variant-annotation-table.ht \
         --variant-results-url=gs://schizophrenia-browser/190415/2019-04-15_schema-browser-variant-results-table-meta-rare-denovos-common-merged.ht \
         --output-url=gs://schizophrenia-browser/190415/variant_results.ht"
   ```

4. Stop cluster.
   ```
   cluster stop schema-data-prep
   ```

5. Start another cluster with no preemptible workers.
   ```
   cluster start --max-idle=30m --packages=elasticsearch schema-data-load
   ```

6. Load tables into Elasticsearch. Replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```
   cluster submit schema-data-load ./projects/gnomad/data/export_ht_to_es.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--ht-url=gs://schizophrenia-browser/190415/gene_results.ht \
         --host=$ELASTICSEARCH_IP \
         --index-name=schema_gene_results_2019_04_15 \
         --index-type=result \
         --num-shards=2"

   cluster submit schema-data-load ./projects/gnomad/data/export_ht_to_es.py \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      --args "--ht-url=gs://schizophrenia-browser/190415/variant_results.ht \
         --host=$ELASTICSEARCH_IP \
         --index-name=schema_variant_results_2019_04_15 \
         --index-type=variant \
         --num-shards=2"
   ```

7. Stop cluster.
   ```
   cluster stop schema-data-load
   ```

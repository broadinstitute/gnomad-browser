# Updating ClinVar variants

1. Delete clinvar.xml from the data pipeline output bucket so that the data pipeline will download the latest version

   ```
   gsutil rm gs://gnomad-browser-data-pipeline/output/external_sources/clinvar.xml.gz
   ```

2. Run data pipeline

   ClinVar pipelines use VEP and thus must be run on clusters with VEP installed and configured. To match gnomAD v2.1, GRCh37 ClinVar variants should be annotated with VEP 85. To match gnomAD v3.1, GRCh38 ClinVar variants should be annotated with VEP 101.

   1. Start Dataproc cluster

      GRCh37

      ```
      ./deployctl dataproc-cluster start vep85 \
         --vep GRCh37 \
         --num-secondary-workers 32
      ```

      GRCh38

      ```
      ./deployctl dataproc-cluster start vep101 \
         --init=gs://gnomad-browser-data-pipeline/init-vep101.sh \
         --metadata=VEP_CONFIG_PATH=/vep_data/vep-gcloud.json,VEP_CONFIG_URI=file:///vep_data/vep-gcloud.json,VEP_REPLICATE=us \
         --master-machine-type n1-highmem-8 \
         --worker-machine-type n1-highmem-8 \
         --worker-boot-disk-size=200 \
         --secondary-worker-boot-disk-size=200 \
         --num-secondary-workers 16
      ```

   2. Run pipeline

      GRCh37

      ```
      ./deployctl data-pipeline run --cluster vep85 clinvar_grch37
      ```

      GRCh38

      ```
      ./deployctl data-pipeline run --cluster vep101 clinvar_grch38
      ```

3. Load variants to Elasticsearch

   GRCh37

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster vep85 clinvar_grch37_variants
   ```

   GRCh38

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster vep101 clinvar_grch38_variants
   ```

4. [Update Elasticsearch index aliases](./ElasticsearchIndexAliases.md)

   Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

   Step 3 loads the new indices into Elasticsearch with a descriptive name including a timestamp.

   Replace the `clinvar_grch37_variants` and `clinvar_grch38_variants` aliases with the new indices.

   Lookup the names of all the indices that exist

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_cat/indices
   ```

   Replace an older index associated with an alias with a newer one

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPOST http://localhost:9200/_aliases --header "Content-Type: application/json" --data @- <<EOF
   {
      "actions": [
         {"remove": {"index": "clinvar_grch37_variants-<previous_timestamp>", "alias": "clinvar_grch37_variants"}},
         {"add": {"index": "clinvar_grch37_variants-<new_timestamp>", "alias": "clinvar_grch37_variants"}}
      ]
   }
   EOF
   ```

5. [Clear Redis cache](./RedisCache.md)

   Start a shell in the Redis pod.

   Delete cache keys matching `clinvar_variants:*`.

   ```
   redis-cli -n 1 --scan --pattern 'clinvar_variants:*' | xargs redis-cli -n 1 del
   ```

6. Delete old Elasticsearch indices

   Remove the specified index

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XDELETE "http://localhost:9200/<index_name>-<previous_timestamp>"
   ```

7. [Create an Elasticsearch snapshot](./ElasticsearchSnapshots.md)

   Create a snapshot with the current date

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT 'http://localhost:9200/_snapshot/backups/%3Csnapshot-%7Bnow%7BYYYY.MM.dd.HH.mm%7D%7D%3E'
   ```

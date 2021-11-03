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

   Update `clinvar_grch37_variants` and `clinvar_grch38_variants` aliases with new indices.

5. [Clear Redis cache](./RedisCache.md)

   Delete cache keys matching `clinvar_variants:*`.

6. Delete old Elasticsearch indices

7. [Create an Elasticsearch snapshot](./ElasticsearchSnapshots.md)

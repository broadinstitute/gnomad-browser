# Updating ClinVar variants

0. Create a backup of the previous ClinVar release files:

   ```
   CLINVAR_BACKUP_DATE=$(date '+%Y-%m-%d')
   CLINVAR_BACKUP_PATH="gs://gnomad-v4-data-pipeline/output/clinvar_backups/${CLINVAR_BACKUP_DATE}_clinvar_backup/"

   gsutil -m cp -r "gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht" "$CLINVAR_BACKUP_PATH"
   gsutil -m cp -r "gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht" "$CLINVAR_BACKUP_PATH"
   ```

1. Delete clinvar.xml from the data pipeline output bucket so that the data pipeline will download the latest version

   ```
   gsutil rm gs://gnomad-browser-data-pipeline/output/external_sources/clinvar.xml.gz
   ```

2. Run data pipelines

   ClinVar pipelines use VEP and thus must be run on clusters with VEP installed and configured. To match gnomAD v2.1 (GRCh37) ClinVar variants should be annotated with VEP 85. To match gnomAD v4.1 (GRCh38) ClinVar variants should be annotated with VEP 105.

   The first step, in which the pipeline(s) parse the input ClinVar XML produces an intermediate Hail table that is used by both pipelines. Thus, to avoid duplicating work, it is best to wait for the first pipeline to finish this step, before starting the second pipeline.

   1. GRCh37

      Start cluster

      ```
      ./deployctl dataproc-cluster start clinvar-grch37-vep85 \
         --init=gs://gnomad-v4-data-pipeline/output/clinvar/vep85/gnomad-browser-grch37-vep85-init.sh \
         --metadata=VEP_CONFIG_PATH=/vep_data/vep-gcloud.json,VEP_CONFIG_URI=file:///vep_data/vep-gcloud.json \
         --master-machine-type n1-highmem-8 \
         --worker-machine-type n1-highmem-8 \
         --master-boot-disk-type=pd-ssd \
         --worker-boot-disk-type=pd-ssd \
         --secondary-worker-boot-disk-type=pd-ssd \
         --worker-boot-disk-size=200 \
         --secondary-worker-boot-disk-size=200 \
         --num-secondary-workers 16
      ```

      Run pipeline

      ```
      ./deployctl data-pipeline run --cluster vep85 clinvar-grch37-vep85
      ```

      Stop the cluster

      ```
      ./deployctl dataproc-cluster stop clinvar-grch37-vep85
      ```

   2. GRCh38

      Once the GRCh37 pipeline finishes the "parse_clinvar_xml" step, start this pipeline.

      Start cluster

      ```
      ./deployctl dataproc-cluster start clinvar-grch38-vep105 \
         --init=gs://gnomad-v4-data-pipeline/output/clinvar/gnomad-browser-grch38-vep105-init.sh \
         --metadata=VEP_CONFIG_PATH=/vep_data/vep-gcloud.json,VEP_CONFIG_URI=file:///vep_data/vep-gcloud.json,VEP_REPLICATE=us \
         --master-machine-type n1-highmem-8 \
         --worker-machine-type n1-highmem-8 \
         --master-boot-disk-type=pd-ssd \
         --worker-boot-disk-type=pd-ssd \
         --secondary-worker-boot-disk-type=pd-ssd \
         --worker-boot-disk-size=200 \
         --secondary-worker-boot-disk-size=200 \
         --num-secondary-workers 16
      ```

      Run pipeline

      ```
      ./deployctl data-pipeline run --cluster vep105 clinvar_grch38
      ```

      Stop the cluster

      ```
      ./deployctl dataproc-cluster stop clinvar-grch38-vep105
      ```

      ```

      ```

3. Load variants to Elasticsearch

   Start dataproc cluster

   ```
   ./deployctl dataproc-cluster start clinvar-es-load
   ```

   GRCh37

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster clinvar-es-load clinvar_grch37_variants
   ```

   GRCh38

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster clinvar-es-load clinvar_grch38_variants
   ```

   Stop the cluster

   ```
   ./deployctl dataproc-cluster stop rhg-clinvar-es-load
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

8. Update the public ClinVar buckets

   We release these final hail tables in a requester pays bucket, `gs://gnomad-browser-clinvar`, use `gsutil rsync` to keep the files in sync.

   ```bash
   # TODO: update these paths! I should push a "..._latest" and "..._<YYYY-MM-DD>", I think
   ```

   GRCh37

   ```
   gsutil -u gnomadev -m rsync -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht/ \
     gs://gnomad-browser-clinvar/gnomad_clinvar_grch37.ht
   ```

   GRCh38

   ```
   gsutil -u gnomadev -m rsync -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht/ \
     gs://gnomad-browser-clinvar/gnomad_clinvar_grch38.ht
   ```

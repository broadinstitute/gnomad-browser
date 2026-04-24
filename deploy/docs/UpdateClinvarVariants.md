# Updating ClinVar variants

0. (Optional) Create a backup of the previous ClinVar release files:

   Grab the release date, e.g. `2026-03-02` from Hail's globals. It's stored as a string in the part file.

   ```
   CLINVAR_PATH="gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht"

   OLD_CLINVAR_RELEASE_DATE=$(gsutil cat "${CLINVAR_PATH}/globals/parts/part-0" | strings | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}')

   CLINVAR_BACKUP_PATH="gs://gnomad-v4-data-pipeline/output/clinvar_backups/${OLD_CLINVAR_RELEASE_DATE}_clinvar_release_backup/"
   ```

   Back up just the final output of both the GRCh37, and GRCh38 pipelines

   ```
   gsutil -u exac-gnomad -m cp -r "gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht" "$CLINVAR_BACKUP_PATH"
   gsutil -u exac-gnomad -m cp -r "gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht" "$CLINVAR_BACKUP_PATH"
   ```

1. Delete clinvar.xml from the data pipeline output bucket so that the data pipeline will download the latest version

   ```
   gsutil -u exac-gnomad rm gs://gnomad-v4-data-pipeline/output/external_sources/clinvar.xml.gz
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
      ./deployctl data-pipeline run --cluster clinvar-grch37-vep85 clinvar_grch37
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
      ./deployctl data-pipeline run --cluster clinvar-grch38-vep105 clinvar_grch38
      ```

      Stop the cluster

      ```
      ./deployctl dataproc-cluster stop clinvar-grch38-vep105
      ```

3. Load variants to Elasticsearch

   Start dataproc cluster

   ```
   ./deployctl dataproc-cluster start clinvar-es-load
   ```

   VPN into the Broad, if you are not on site, using the Cisco Secure Client

   Get the Elastic password to be used

   ```
   ELASTICSEARCH_PASSWORD=$(./deployctl elasticsearch get-password)
   ```

   Load the GRCh37 ClinVar data to an ES index

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster clinvar-es-load clinvar_grch37_variants
   ```

   Load the GRCh38 ClinVar data to an ES index

   ```
   ./deployctl elasticsearch load-datasets --dataproc-cluster clinvar-es-load clinvar_grch38_variants
   ```

   Stop the ES-load cluster

   ```
   ./deployctl dataproc-cluster stop clinvar-es-load
   ```

4. [Update Elasticsearch index aliases](./ElasticsearchIndexAliases.md)

   Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

   Step 3 loads the new indices into Elasticsearch with a descriptive name including a timestamp.

   Replace the `clinvar_grch37_variants` and `clinvar_grch38_variants` aliases with the new indices.

   Lookup the names of all the indices that exist

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_cat/indices/*,-.*?pretty&v=true&s=index:asc"
   ```

   For aliases

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_cat/aliases/*,-.*?pretty&v=true&s=index:asc"
   ```

   To replace a given alias's associated index, run a command like this:

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

5. Clear gnomAD Browser caches

   Clear both the Redis and Nginx caches gnomAD has to see the new data in production

   1. Clear the [Redis cache](./RedisCache.md)

      Start a shell in the Redis pod.

      ```
      REDIS_POD=$(kubectl get pods --selector=name=redis -o=name)
      kubectl exec -ti $REDIS_POD -- /bin/bash
      ```

      Delete cache keys matching `production:clinvar_variants:*`.

      ```
      redis-cli -n 1 --scan --pattern 'production:clinvar_variants:*' | xargs redis-cli -n 1 del
      ```

   2. (Optional) Clear Nginx cache

      When creating a new deployment, this cache gets blown away. However, if you don't anticipate creating a new deployment soon, you can manually clear the Nginx cache to have production serve the new ClinVar data right away.

      Get the deployment serving production

      ```
      ./deployctl production describe
      ```

      Check the pod name for that color

      ```
      kubectl get pods
      ```

      Exec into the current production gnomAD browser pod

      ```
      kubectl exec -it gnomad-browser-<POD_NAME> -- sh
      ```

      e.g. to exec into production when the color was `blue` once, the command was:

      ```
      kubectl exec -it gnomad-browser-blue-68fbcbc54f-5nxfj -- sh
      ```

      Cache data dirs are named with a single symbol hexidecimal character, e.g. `0`, `1`, ... `9`, `a`, `b`, ... `f`, and are stored in `/var/cache/nginx`

      Manually delete the dirs 1 by 1 with `rm -rf <DIR>`

      Or, remove all the cache dirs programatically

      ```
      rm -rf /var/cache/nginx/[0-9a-f]
      ```

6. Delete old Elasticsearch indices

   Remove the specified index

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XDELETE "http://localhost:9200/<index_name>-<previous_timestamp>"
   ```

7. (Optional) [Create an Elasticsearch snapshot](./ElasticsearchSnapshots.md)

   gnomAD Browser's ES instance is set to take snapshots on a monthly basis, if you want, you can create a snapshot with the current date right after loading the new ClinVar data, and setting the aliases

   ```
   curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT 'http://localhost:9200/_snapshot/backups/%3Csnapshot-%7Bnow%7BYYYY.MM.dd.HH.mm%7D%7D%3E'
   ```

8. Update the public ClinVar buckets

   We release these final hail tables into a requester pays GCS bucket: `gs://gnomad-browser-clinvar`. Copy the newly created final tables with `gsutil rsync` with the `-d` flag to keep the `_latest` hail table dir correctly sync'd

   Grab the release date, e.g. `2026-03-02` from Hail's globals with `strings` and `grep` for use in releasing a file with a release date appended.

   ```
   CLINVAR_PATH="gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht"

   NEW_CLINVAR_RELEASE_DATE=$(gsutil cat "${CLINVAR_PATH}/globals/parts/part-0" | strings | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}')
   echo $NEW_CLINVAR_RELEASE_DATE
   ```

   GRCh37 - overwrite the `..._latest.ht` table, create a date stamped table (`..._YYYY-MM-DD_release.ht`

   ```
   gsutil -u exac-gnomad -m rsync -d -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht/ \
     gs://gnomad-browser-clinvar/grch37/gnomad_browser_clinvar_grch37_latest.ht
   ```

   ```
   gsutil -u exac-gnomad -m rsync -d -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch37_annotated_2.ht/ \
     "gs://gnomad-browser-clinvar/grch37/gnomad_browser_clinvar_grch37_${NEW_CLINVAR_RELEASE_DATE}_release.ht"
   ```

   GRCh38 - overwrite the `..._latest.ht` table, create a date stamped table (`..._YYYY-MM-DD_release.ht`

   ```
   gsutil -u exac-gnomad -m rsync -d -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht/ \
     gs://gnomad-browser-clinvar/grch38/gnomad_browser_clinvar_grch38_latest.ht
   ```

   ```
   gsutil -u exac-gnomad -m rsync -d -r \
     gs://gnomad-v4-data-pipeline/output/clinvar/clinvar_grch38_annotated_2.ht/ \
     "gs://gnomad-browser-clinvar/grch38/gnomad_browser_clinvar_grch38_${NEW_CLINVAR_RELEASE_DATE}_release.ht"
   ```

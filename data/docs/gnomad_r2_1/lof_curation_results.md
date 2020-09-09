# gnomAD LoF curation results

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare the curation result data for the browser. Replace `$CURATION_RESULT_BROWSER_HT_URL` with the
   location to store the Hail table.

   ```shell
   hailctl dataproc submit data-load \
      ./data/gnomad_r2_1/prepare_lof_curation_results.py \
         --output=$CURATION_RESULT_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$CURATION_RESULT_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $CURATION_RESULT_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         lof_curation_results
   ```

4. Delete the Dataproc cluster

   ```shell
   hailctl dataproc stop data-load
   ```

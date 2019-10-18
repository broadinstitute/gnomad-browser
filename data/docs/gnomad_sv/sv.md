# gnomAD structural variants

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare the SV data for the browser. Replace `$GNOMAD_SV_BROWSER_HT_URL` with the
   location to store the Hail table.

   ```shell
   hailctl dataproc submit data-load \
      ./data/gnomad_sv/prepare_gnomad_svs.py \
         $GNOMAD_SV_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$GNOMAD_SV_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_SV_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_structural_variants_r2_1 \
         --id-field variant_id \
         --num-shards 2
   ```

4. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-load
   ```

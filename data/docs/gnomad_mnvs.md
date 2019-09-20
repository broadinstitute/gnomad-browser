# gnomAD multi-nucleotide variants

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare the MNV data for the browser. Replace `$GNOMAD_MNV_BROWSER_HT_URL` with the
   location to store the Hail table.

   !!! TODO: Update prepare_gnomad_mnvs_for_browser.py. The format of the MNV data files
   have changed since it was written.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./hail-elasticsearch-pipelines/hail_scripts \
      ./data/prepare_gnomad_mnvs_for_browser.py \
         --mnv-url=gs://gnomad-public/release/2.1/mnv/gnomad_mnv_coding.tsv \
         --three-bp-mnv-url=gs://gnomad-public/release/2.1/mnv/gnomad_mnv_coding_3bp_fullannotation.tsv \
         --output-url=$GNOMAD_MNV_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$GNOMAD_MNV_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_MNV_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_2_1_mnvs \
         --id-field variant_id \
         --num-shards 2 \
         --set-type consequences.snv_consequences=object \
         --disable-field consequences.snv_consequences \
         --set-type constituent_snvs=object \
         --disable-field constituent_snvs \
         --set-type related_mnvs=object \
         --disable-field related_mnvs
   ```

4. Delete the Dataproc cluster

   ```shell
   hailctl dataproc stop data-load
   ```

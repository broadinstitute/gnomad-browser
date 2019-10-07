# gnomAD v3 variants

## Prepare data

1. Create a Dataproc cluster.
   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare variants.
   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r3/prepare_gnomad_r3_variants.py \
         gs://gnomad-public/release/3.0/ht/genomes/gnomad.genomes.r3.0.sites.ht \
         $GNOMAD_VARIANTS_BROWSER_HT_URL
   ```

3. Load variants into Elasticsearch. Use the `$GNOMAD_VARIANTS_BROWSER_HT_URL` from step 2 and
   replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_r3_variants
   ```

4. Delete the Dataproc cluster.
   ```shell
   hailctl dataproc stop data-load
   ```

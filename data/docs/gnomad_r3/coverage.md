# gnomAD v3 Coverage

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 48
   ```

2. Prepare coverage for browser.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r3/prepare_gnomad_r3_coverage.py \
         gs://gnomad-public/release/3.0/coverage/genomes/gnomad.genomes.r3.0.coverage.ht \
         $GNOMAD_COVERAGE_BROWSER_HT_URL
   ```

3. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-prep
   ```

## Load data

4. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

5. Load gnomAD coverage into Elasticsearch. Use the `$GNOMAD_COVERAGE_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_COVERAGE_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_r3_coverage \
         --num-shards 12 \
         --id-field xpos
   ```

6. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-load
   ```

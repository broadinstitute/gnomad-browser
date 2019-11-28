# ExAC coverage

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare coverage.

   ```shell
   hailctl dataproc submit data-load \
      ./data/exac/prepare_exac_coverage.py \
         $EXAC_COVERAGE_BROWSER_HT_URL
   ```

## Load data

3. Load overage into Elasticsearch. Use the `$EXAC_COVERAGE_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $EXAC_COVERAGE_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         exac_coverage \
         --num-shards=2
   ```

4. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-load
   ```

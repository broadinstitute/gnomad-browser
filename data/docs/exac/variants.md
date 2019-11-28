# ExAC variants and coverage

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start exac \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Create a Hail table from the ExAC VCF. This script also adds derived fields that are displayed in the browser.
   Replace `$EXAC_VARIANTS_BROWSER_HT_URL` with the location to store the Hail table.

   ```shell
   hailctl dataproc submit exac \
      --pyfiles ./data/data_utils \
      ./data/exac/export_exac_vcf_to_ht.py \
         --output-url=$EXAC_VARIANTS_BROWSER_HT_URL
   ```

## Load data

3. Load the Hail table into Elasticsearch. Use the `$EXAC_VARIANTS_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit exac \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $EXAC_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         exac_variants \
         --num-shards 2 \
         --id-field variant_id
   ```

4. Delete the Dataproc cluster

   ```shell
   hailctl dataproc stop exac
   ```

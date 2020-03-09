# pext scores

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Prepare data.

   ```shell
   hailctl dataproc submit data-prep \
      ./data/prepare_pext.py \
         $PEXT_URL
   ```

3. Load data into Elasticsearch.
   Replace `$PEXT_URL` with the output path from the last step
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $PEXT_URL \
         $ELASTICSEARCH_IP \
         pext_grch37 \
         --id-field gene_id \
         --num-shards 2
   ```

4. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-prep
   ```

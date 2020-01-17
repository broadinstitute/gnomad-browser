# ClinVar variants

## Prepare GRCh37 variants

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 16 \
      --vep GRCh37
   ```

2. Prepare variants.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/clinvar/prepare_clinvar_variants.py \
         GRCh37 \
         $CLINVAR_GRCH37_VARIANTS_BROWSER_HT_URL
   ```

3. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-prep
   ```

## Prepare GRCh38 variants

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 16 \
      --vep GRCh38
   ```

2. Prepare variants.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/clinvar/prepare_clinvar_variants.py \
         GRCh38 \
         $CLINVAR_GRCH38_VARIANTS_BROWSER_HT_URL
   ```

3. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-prep
   ```

## Load data into Elasticsearch

1. Start a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Load variants into Elasticsearch. Use the `$CLINVAR_GRCH37_VARIANTS_BROWSER_HT_URL`
   from step 2 and the `$CLINVAR_GRCH37_VARIANTS_BROWSER_HT_URL` from step 5.
   Replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $CLINVAR_GRCH37_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         clinvar_variants_grch37 \
         --num-shards 2

   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $CLINVAR_GRCH38_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         clinvar_variants_grch38 \
         --num-shards 2
   ```

3. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-load
   ```

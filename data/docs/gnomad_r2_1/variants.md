# gnomAD variants

## Prepare data

1. Create a Dataproc cluster.
   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 98
   ```

2. Prepare gnomAD exome variants.
   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r2_1/prepare_gnomad_r2_1_variants.py \
         gs://gnomad-public/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht \
         $GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL
   ```
 
3. Prepare gnomAD genome variants.
   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r2_1/prepare_gnomad_r2_1_variants.py \
         gs://gnomad-public/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht \
         $GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL
   ```

4. Delete the Dataproc cluster.
   ```shell
   hailctl dataproc stop data-prep
   ```

## Load data

5. Create a Dataproc cluster.
   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --num-preemptible-workers 8 \
      --packages "elasticsearch~=5.5"
   ```

6. Load gnomAD exome variants into Elasticsearch. Use the `$GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL`
   from step 2 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_EXOME_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_exomes_2_1_1 \
         --num-shards 12 \
         --id-field variant_id
   ```

7. Load gnomAD genome variants into Elasticsearch. Use the `$GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL`
   from step 3 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_GENOME_VARIANTS_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_genomes_2_1_1 \
         --num-shards 12 \
         --id-field variant_id
   ```

8. Delete the Dataproc cluster.
   ```shell
   hailctl dataproc stop data-load
   ```

# gnomAD variants and coverage

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 48
   ```

2. Prepare gnomAD exome coverage.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r2_1/prepare_gnomad_r2_1_coverage.py \
         gs://gnomad-public/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht \
         $GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL
   ```

3. Prepare gnomAD genome coverage.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/gnomad_r2_1/prepare_gnomad_r2_1_coverage.py \
         gs://gnomad-public/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht \
         $GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL
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
      --packages "elasticsearch~=5.5"
   ```

6. Load gnomAD exome coverage into Elasticsearch. Use the `$GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL`
   from step 4 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_EXOME_COVERAGE_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_exome_coverage_2_1 \
         --num-shards=12
   ```

7. Load gnomAD genome coverage into Elasticsearch. Use the `$GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL`
   from step 5 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GNOMAD_GENOME_COVERAGE_BROWSER_HT_URL \
         $ELASTICSEARCH_IP \
         gnomad_genome_coverage_2_1 \
         --num-shards=12
   ```

8. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-load
   ```

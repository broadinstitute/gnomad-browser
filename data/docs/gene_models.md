# Gene models

## Prepare data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --num-workers 4 \
      --packages "elasticsearch~=5.5"
   ```

2. Create a Hail table from the Gencode and other files. Replace `$GENES_HT_URL` with the location
   to store the Hail table.

   Note: gs://gnomad-browser/gene_models/gencode.gtf is a decompressed copy of
   gs://exac/170122_exacv1_bundle/gencode.gtf.gz

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/prepare_gene_models.py \
         gs://gnomad-browser/gene_models/gencode.gtf \
         $GENES_HT_URL \
         --canonical-transcripts gs://exac/170122_exacv1_bundle/canonical_transcripts.txt.gz \
         --omim-annotations gs://exac/170122_exacv1_bundle/omim_info.txt.gz \
         --dbnsfp-gene gs://exac/170122_exacv1_bundle/dbNSFP2.6_gene.gz
   ```

## Load data

3. Load the Hail table into Elasticsearch. Use the `$GENES_HT_URL` from step 2 and replace `$ELASTICSEARCH_IP`
   with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GENES_HT_URL \
         $ELASTICSEARCH_IP \
         genes_grch37 \
         --id-field gene_id \
         --num-shards 2 \
         --set-type exons=object \
         --set-type transcripts.exons=object \
         --disable-field exons \
         --disable-field transcripts.exons
   ```

4. Delete the Dataproc cluster
   ```shell
   hailctl dataproc stop data-load
   ```

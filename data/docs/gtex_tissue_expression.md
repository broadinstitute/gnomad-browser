# GTEx tissue expression

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
      ./data/prepare_gtex_tissue_expression.py \
         gs://gtex_analysis_v7/rna_seq_data/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz \
         gs://gtex_analysis_v7/annotations/GTEx_v7_Annotations_SampleAttributesDS.txt \
         --output $GTEX_V7_HT_URL
   ```

3. Load data into Elasticsearch.
   Replace `$GTEX_V7_HT_URL` with the output path from the last step
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GTEX_V7_HT_URL \
         $ELASTICSEARCH_IP \
         gtex_v7_tissue_expression \
         --id-field transcript_id \
         --num-shards 2
   ```

4. Delete the Dataproc cluster.

   ```shell
   hailctl dataproc stop data-prep
   ```

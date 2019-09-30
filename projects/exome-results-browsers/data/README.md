# Exome Result Browsers Data

## Gene models

1. Download data from Gencode.

   ```shell
   curl -o gencode.v19.gtf.gz 'ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz'
   ```

2. Decompress Gencode files so that Hail can read them. They can also be compressed with bgzip.

   ```shell
   gunzip gencode.v19.gtf.gz
   bgzip gencode.v19.gtf
   ```

3. Download data from HGNC.

   This is a link generated from https://www.genenames.org/download/custom/ including Ensembl gene IDs and OMIM IDs.

   ```shell
   curl -o hgnc.tsv 'https://www.genenames.org/cgi-bin/download/custom?col=gd_hgnc_id&col=gd_app_sym&col=gd_app_name&col=gd_prev_sym&col=gd_aliases&col=md_mim_id&col=md_ensembl_id&status=Approved&hgnc_dbtag=on&order_by=gd_app_sym_sort&format=text&submit=submit'
   ```

4. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

5. Combine GTF files, HGNC data, and canonical transcripts lists.

   ```shell
   hailctl dataproc submit data-load \
      ./prepare_gene_models.py \
         /path/to/gencode.v19.gtf.gz \
         /path/to/canonical_transcripts.tsv.gz \
         /path/to/hgnc.tsv \
         --output /path/to/genes.ht
   ```

6. Load the Hail table into Elasticsearch.
   Replace `$GENES_HT_URL` with the output path from the last step
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      ../../../data/export_hail_table_to_elasticsearch.py \
         $GENES_HT_URL \
         $ELASTICSEARCH_IP \
         exome_results_genes \
         --id-field gene_id \
         --num-shards 2 \
         --set-type canonical_transcript.exons=object \
         --disable-field canonical_transcript.exons
   ```

7. Delete the Dataproc cluster
   ```shell
   hailctl dataproc stop data-load
   ```

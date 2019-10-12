# Gene models

## Prepare data

### Canonical transcripts

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-preemptible-workers 24
   ```

2. Get list of canonical transcripts from VEP annotations on gnomAD variants.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/get_canonical_transcripts_from_vep.py \
         gs://gnomad-public/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht \
         gs://gnomad-public/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht \
         --output $CANONICAL_TRANSCRIPTS_GRCH37_PATH
   ```

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/get_canonical_transcripts_from_vep.py \
         gs://gnomad-public/release/3.0/ht/genomes/gnomad.genomes.r3.0.sites.ht \
         --output $CANONICAL_TRANSCRIPTS_GRCH38_PATH
   ```

   TODO: Get canonical transcripts for gnomAD v3 / GRCh38

3. Delete the Dataproc cluster

   ```shell
   hailctl dataproc stop data-prep
   ```

### Gene models

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-prep \
      --max-idle 30m \
      --num-workers 4
   ```

2. Download data from Gencode.

   ```shell
   curl -o gencode.v19.gtf.gz 'ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz'

   curl -o gencode.v29.gtf.gz 'ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_29/gencode.v29.annotation.gtf.gz'
   ```

3. Decompress Gencode files so that Hail can read them. They can also be compressed with bgzip.

   ```shell
   gunzip gencode.v19.gtf.gz
   bgzip -c gencode.v19.gtf > gencode.v19.gtf.bgz

   gunzip gencode.v29.gtf.gz
   bgzip -c gencode.v29.gtf > gencode.v29.gtf.bgz
   ```

4. Download data from HGNC.

   This is a link generated from https://www.genenames.org/download/custom/ including Ensembl gene IDs and OMIM IDs.

   ```shell
   curl -o hgnc.tsv 'https://www.genenames.org/cgi-bin/download/custom?col=gd_hgnc_id&col=gd_app_sym&col=gd_app_name&col=gd_prev_sym&col=gd_aliases&col=md_mim_id&col=md_ensembl_id&status=Approved&hgnc_dbtag=on&order_by=gd_app_sym_sort&format=text&submit=submit'
   ```

5. Combine GTF files, HGNC data, and canonical transcripts lists.

   ```shell
   hailctl dataproc submit data-prep \
      --pyfiles ./data/data_utils \
      ./data/prepare_gene_models.py \
         --gencode 29 \
            /path/to/gencode.v29.gtf.bgz \
            $CANONICAL_TRANSCRIPTS_GRCH38_PATH \
         --gencode 19 \
            /path/to/gencode.v19.gtf.bgz \
            $CANONICAL_TRANSCRIPTS_GRCH37_PATH \
         --hgnc /path/to/hgnc.tsv \
         --output /path/to/genes.ht
   ```

6. Delete the Dataproc cluster

   ```shell
   hailctl dataproc stop data-prep
   ```

## Load data

1. Create a Dataproc cluster.

   ```shell
   hailctl dataproc start data-load \
      --max-idle 30m \
      --packages "elasticsearch~=5.5"
   ```

2. Load the Hail table into Elasticsearch.
   Replace `$GENES_HT_URL` with the output path from the last step
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   hailctl dataproc submit data-load \
      --pyfiles ./data/data_utils \
      ./data/export_hail_table_to_elasticsearch.py \
         $GENES_HT_URL \
         $ELASTICSEARCH_IP \
         genes \
         --id-field gene_id \
         --num-shards 2 \
         --set-type gencode.v29.exons=object \
         --set-type gencode.v29.transcripts.exons=object \
         --disable-field gencode.v29.exons \
         --disable-field gencode.v29.transcripts.exons \
         --set-type gencode.v19.exons=object \
         --set-type gencode.v19.transcripts.exons=object \
         --disable-field gencode.v19.exons \
         --disable-field gencode.v19.transcripts.exons
   ```

3. Delete the Dataproc cluster
   ```shell
   hailctl dataproc stop data-load
   ```

# Data for gnomAD browser

## Reference data

TODO

## Variant datasets

### gnomAD

TODO

### ExAC

1. Create a Dataproc cluster using [cloudtools](https://pypi.org/project/cloudtools/).
   ```shell
   cluster start \
     --packages=elasticsearch \
     --max-idle=30m \
     --num-workers=2 \
     --num-preemptible-workers=24 \
     load-exac
   ```

2. Download https://github.com/macarthur-lab/hail-elasticsearch-pipelines and zip the contents.
This repository contains helper functions used in the following Hail scripts.
   ```shell
   git clone https://github.com/macarthur-lab/hail-elasticsearch-pipelines.git
   cd hail-elasticsearch-pipelines
   zip -r hail_scripts.zip hail_scripts
   ```

3. Create a Hail table from the ExAC VCF. This script also adds derived fields that are
displayed in the browser. Replace `$HT_URL` with the location to store the Hail table.
   ```shell
   gcloud dataproc jobs submit pyspark \
     --cluster=load-exac \
     --py-files=/path/to/hail-elasticsearch-pipelines/hail_scripts.zip \
     ./projects/gnomad/data/export_exac_vcf_to_ht.py -- \
     --output-url=$HT_URL
   ```

4. Load the Hail table into Elasticsearch. Use the `$HT_URL` from step 3 and replace
`$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   gcloud dataproc jobs submit pyspark \
      --cluster=load-exac \
      --py-files=/path/to/hail-elasticsearch-pipelines/hail_scripts.zip \
      ./projects/gnomad/data/export_ht_to_es.py -- \
      --ht-url=$HT_URL \
      --host=$ELASTICSEARCH_IP \
      --index-name=exac_v1_variants \
      --index-type=variant
   ```

5. Tear down Dataproc cluster
   ```shell
   cluster stop load-exac
   ```

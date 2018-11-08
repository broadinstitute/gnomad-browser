# Epi25

1. Create Dataproc cluster with Hail 0.1.
   ```shell
   cluster start \
      --max-idle=30m \
      --version=0.1 \
      --zone=$GCLOUD_ZONE \
      epi25-data
   ```
   Note: If Elasticsearch is exposed through an internal load balancer, be sure to create the Dataproc
   cluster in the same GCP zone as the Elasticsearch cluster.

2. Download https://github.com/macarthur-lab/hail-elasticsearch-pipelines and zip the contents.
   This repository contains helper functions used in the following Hail scripts.
   ```shell
   git clone https://github.com/macarthur-lab/hail-elasticsearch-pipelines.git
   cd hail-elasticsearch-pipelines
   zip -r hail_scripts.zip hail_scripts
   ```

3. Submit gene results loading script.
   ```
   gcloud dataproc jobs submit pyspark \
      --cluster=epi25-data \
      --py-files=/path/to/hail-elasticsearch-pipelines/hail_scripts.zip \
      ./projects/exome-results/browsers/epi25k/load_gene_results_to_es.py -- \
         --host=$ELASTICSEARCH_IP
   ```

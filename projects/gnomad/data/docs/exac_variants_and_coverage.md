# ExAC variants and coverage

## Prepare data

1. Create a Dataproc cluster.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      exac-data-prep 2 24
   ```

2. Create a Hail table from the ExAC VCF. This script also adds derived fields that are displayed in the browser.
   Replace `$EXAC_VARIANTS_BROWSER_HT_URL` with the location to store the Hail table.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=exac-data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_exac_vcf_to_ht.py \
         --output-url=$EXAC_VARIANTS_BROWSER_HT_URL
   ```

3. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py exac-data-prep
   ```

## Load data

4. Create a Dataproc cluster with no preemptible workers.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      exac-data-load 2
   ```

5. Load the Hail table into Elasticsearch. Use the `$EXAC_VARIANTS_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=exac-data-load \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$EXAC_VARIANTS_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=exac_v1_variants \
         --index-type=variant
   ```

6. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py exac-data-load
   ```

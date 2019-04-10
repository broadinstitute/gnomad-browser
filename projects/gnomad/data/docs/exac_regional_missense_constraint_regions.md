# ExAC regional missense constraint

1. Create a Dataproc cluster with no preemptible workers.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      data-prep 2
   ```

2. Prepare the data for the browser. Replace `$EXAC_REGIONAL_MISSENSE_BROWSER_HT_URL` with the
   location to store the Hail table.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_exac_regional_missense_constraint_regions_for_browser.py \
         --input-url=fordist_constraint_official_regional_missense_cleaned_metrics_nosynoutliers.txt \
         --output-url=$EXAC_REGIONAL_MISSENSE_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$EXAC_REGIONAL_MISSENSE_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=data-prep \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$EXAC_REGIONAL_MISSENSE_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=exac_regional_missense_constraint_regions \
         --index-type=region
   ```

4. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py data-prep
   ```

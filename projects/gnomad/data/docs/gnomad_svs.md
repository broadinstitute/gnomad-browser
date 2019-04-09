# gnomAD structural variants

1. Create a Dataproc cluster with no preemptible workers.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      gnomad-svs 2
   ```

2. Prepare the SV data for the browser. Replace `$GNOMAD_SV_BROWSER_HT_URL` with the
   location to store the Hail table.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-svs \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_gnomad_svs_for_browser.py \
         --input-url=gs://gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz \
         --output-url=$GNOMAD_SV_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$GNOMAD_SV_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-svs \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_SV_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_structural_variants \
         --index-type=variant
   ```

4. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py gnomad-svs
   ```

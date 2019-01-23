# gnomAD multi-nucleotide variants

1. Create a Dataproc cluster with no preemptible workers.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      gnomad-mnvs 2
   ```

2. Prepare the MNV data for the browser. Replace `$GNOMAD_MNV_BROWSER_HT_URL` with the
   location to store the Hail table.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-mnvs \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_gnomad_mnvs.py \
         --input-url=gs://gnomad-qingbowang/MNV/to_public/mnv_exome_beta.tsv \
         --output-url=$GNOMAD_MNV_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$GNOMAD_MNV_BROWSER_HT_URL` from step 2
   and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-mnvs \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_MNV_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_exome_mnvs_2_1 \
         --index-type=mnv
   ```

4. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py gnomad-mnvs
   ```

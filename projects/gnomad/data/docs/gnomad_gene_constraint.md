# gnomAD gene constraint

1. Create a Dataproc cluster with no preemptible workers.

   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/v02/create_cluster_without_VEP.py \
      gnomad-gene-constraint 2
   ```

2. Prepare the MNV data for the browser. Replace `$GNOMAD_GENE_CONSTRAINT_BROWSER_HT_URL` with
   the location to store the Hail table.

   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-gene-constraint \
      --hail-version=0.2 \
      ./projects/gnomad/data/prepare_gnomad_r2_1_constraint_for_browser.py \
         --output-url=$GNOMAD_GENE_CONSTRAINT_BROWSER_HT_URL
   ```

3. Load the Hail table into Elasticsearch. Use the `$GNOMAD_GENE_CONSTRAINT_BROWSER_HT_URL`
   from step 2 and replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.

   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/submit.py \
      --cluster=gnomad-gene-constraint \
      --hail-version=0.2 \
      ./projects/gnomad/data/export_ht_to_es.py \
         --ht-url=$GNOMAD_GENE_CONSTRAINT_BROWSER_HT_URL \
         --host=$ELASTICSEARCH_IP \
         --index-name=gnomad_constraint_2_1_1 \
         --index-type=constraint \
         --num-shards=2
   ```

4. Delete the Dataproc cluster
   ```shell
   ./hail-elasticsearch-pipelines/gcloud_dataproc/delete_cluster.py gnomad-gene-constraint
   ```

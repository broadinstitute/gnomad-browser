# SCHEMA

1. Create Dataproc cluster
   ```
   cd gnomadjs
   ./hail-db-utils/create_cluster_without_VEP.py \
      --project $GCLOUD_PROJECT \
      --zone $GCLOUD_ZONE \
      schema-data-load 2
   ```

2. Submit loading script
   ```
   ./hail-db-utils/submit_hail_v0.1.py \
      --project $GCLOUD_PROJECT \
      --cluster no-vep \
      projects/exome-results-browsers/browsers/schema/data/load_schizophrenia_data_180512.py
   ```

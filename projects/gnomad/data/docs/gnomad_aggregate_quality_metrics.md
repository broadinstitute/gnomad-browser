# gnomAD aggregate quality metrics

1. Download quality metric histogram files.
   ```shell
   gsutil cp gs://gnomad/release/2.1/json/gnomad.exomes.json ./gnomad.exomes.json
   gsutil cp gs://gnomad/release/2.1/json/gnomad.genomes.json ./gnomad.genomes.json
   ```

2. Upload to Elasticsearch. Replace `$ELASTICSEARCH_IP` with the IP address of your Elasticsearch server.
   ```shell
   python3 ./projects/gnomad/data/export_aggregate_quality_metrics_to_es.py \
      --metrics-file gnomad.exomes.json \
      --host http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy \
      --index-name aggregate_quality_metrics \
      --tag gnomad_r2_1_1_exomes

   python3 ./projects/gnomad/data/export_aggregate_quality_metrics_to_es.py \
      --metrics-file gnomad.genomes.json \
      --host http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy \
      --index-name aggregate_quality_metrics \
      --tag gnomad_r2_1_1_genomes
   ```

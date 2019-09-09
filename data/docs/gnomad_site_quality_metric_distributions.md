# gnomAD site quality metric distributions

1. Download quality metric histogram files.
   ```shell
   gsutil cp gs://gnomad/release/2.1/json/gnomad.exomes.json ./gnomad.exomes.json
   gsutil cp gs://gnomad/release/2.1/json/gnomad.genomes.json ./gnomad.genomes.json
   ```

2. Shape the data into the format expected by the browser.
   ```shell
   python3 ./data/prepare_gnomad_site_quality_metric_distributions.py \
      --exome-file ./gnomad.exomes.json \
      --genome-file ./gnomad.genomes.json \
      > projects/gnomad/src/client/dataset-constants/gnomadSiteQualityMetricDistributions.json
   ```

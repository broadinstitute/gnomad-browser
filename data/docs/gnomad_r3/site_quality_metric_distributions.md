# gnomAD v3 site quality metric distributions

1. Download quality metric histogram files.

   ```shell
   gsutil cp $URL ./gnomad.genomes.r3.json
   ```

2. Shape the data into the format expected by the browser.

   ```shell
   python3 ./data/prepare_gnomad_site_quality_metric_distributions.py \
      --genome-file ./gnomad.genomes.json \
      > projects/gnomad/src/client/dataset-constants/gnomad_r3/siteQualityMetricDistributions.json
   ```

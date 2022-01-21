from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_short_tandem_repeats import prepare_gnomad_v3_short_tandem_repeats


pipeline = Pipeline()

pipeline.add_task(
    "prepare_short_tandem_repeats",
    prepare_gnomad_v3_short_tandem_repeats,
    "/gnomad_v3/gnomad_v3_short_tandem_repeats.ht",
    {"path": "gs://gcp-public-data--gnomad/release/3.1.3/json/gnomAD_STR_distributions__2022_01_20.json.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"short_tandem_repeats": "prepare_short_tandem_repeats"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

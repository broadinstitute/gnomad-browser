from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_short_tandem_repeats import prepare_gnomad_v3_short_tandem_repeats


pipeline = Pipeline()

pipeline.add_task(
    "prepare_short_tandem_repeats",
    prepare_gnomad_v3_short_tandem_repeats,
    "/gnomad_v3/gnomad_v3_short_tandem_repeats.ht",
    {"path": "gs://gnomad-browser/STRs/gnomAD_v3_STR_data.json.gz"},
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

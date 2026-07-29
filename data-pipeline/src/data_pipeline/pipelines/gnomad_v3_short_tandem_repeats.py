import os

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_short_tandem_repeats import prepare_gnomad_v3_short_tandem_repeats


pipeline = Pipeline()

pipeline.add_task(
    "prepare_short_tandem_repeats",
    prepare_gnomad_v3_short_tandem_repeats,
    "/gnomad_v4/gnomad_v4_short_tandem_repeats.ht",
    {
        # Override with a local path for local dev (avoids GCS auth), e.g.
        #   STR_DISTRIBUTIONS_JSON=/path/to/gnomAD_STR_distributions__gnomad-v2__2026_07_20.json.gz
        "path": os.environ.get(
            "STR_DISTRIBUTIONS_JSON",
            "gs://gnomad-browser/STRs/gnomAD_STR_distributions__gnomad-v2__2026_07_20.json.gz",
        )
    },
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

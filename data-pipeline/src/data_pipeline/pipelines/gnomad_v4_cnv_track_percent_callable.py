from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_track_percent_callable import prepare_cnv_track_callable


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_cnvs_track_percent_callable",
    prepare_cnv_track_callable,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/track_percent_callable.ht",
    {"coverage_path": "gs://gnomad-v4-cnvs/2023-10-24-jfu/track_percent_callable.tsv.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"track_percent_callable": "prepare_gnomad_v4_cnvs_track_percent_callable"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.cnv_coverage import prepare_cnv_track_callable_coverage


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_cnvs_track_percent_callable_coverage",
    prepare_cnv_track_callable_coverage,
    "/gnomad_v4/gnomad_v4_cnvs/coverage_tracks/track_percent_callable.ht",
    {"coverage_path": "gs://gnomad-v4-cnvs/coverage_tracks/track_percent_callable.tsv.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"track_percent_callable_coverage": "prepare_gnomad_v4_cnvs_track_percent_callable_coverage"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

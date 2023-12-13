from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_dup_burden import prepare_cnv_dup_burden


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_cnv_dup_burden",
    prepare_cnv_dup_burden,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/dup_burden.ht",
    {"dup_burden_path": "gs://gnomad-v4-cnvs/2023-10-24-jfu/burden_dup_1.0.txt.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"dup_burden": "prepare_gnomad_v4_cnv_dup_burden"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

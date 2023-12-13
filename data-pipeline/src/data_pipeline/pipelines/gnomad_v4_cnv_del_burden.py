from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_del_burden import prepare_cnv_del_burden


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_cnv_del_burden",
    prepare_cnv_del_burden,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/del_burden.ht",
    {"burden_path": "gs://gnomad-v4-cnvs/2023-10-24-jfu/burden_del_1.0.txt.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"del_burden": "prepare_gnomad_v4_cnv_del_burden"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

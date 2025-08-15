from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnvs import prepare_gnomad_v4_cnvs, prepare_public_gnomad_v4_cnvs

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_del_burden import prepare_cnv_del_burden
from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_dup_burden import prepare_cnv_dup_burden
from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnv_track_percent_callable import prepare_cnv_track_callable

pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_gnomad_v4_cnvs",
    prepare_gnomad_v4_cnvs,
    "/gnomad_v4/gnomad_v4_cnvs/cnvs.ht",
    {"vcf_path": "gs://gnomad-v4-cnvs/2024-03-28-v4.1/GNOMAD_V4.4.5_browser_4.1.vcf.gz"},
)

pipeline.add_task(
    "prepare_public_gnomad_v4_cnvs",
    prepare_public_gnomad_v4_cnvs,
    "/gnomad_v4/gnomad_v4_cnvs/gnomad.v4.1.cnv.all.ht",
    {"input_path": pipeline.get_task("prepare_gnomad_v4_cnvs")},
)

pipeline.add_task(
    "prepare_gnomad_v4_cnv_del_burden",
    prepare_cnv_del_burden,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/del_burden.ht",
    {"burden_path": "gs://gnomad-v4-cnvs/2023-10-24jfu/burden_del_1.0.txt.gz"},
)

pipeline.add_task(
    "prepare_gnomad_v4_cnv_dup_burden",
    prepare_cnv_dup_burden,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/dup_burden.ht",
    {"burden_path": "gs://gnomad-v4-cnvs/2023-10-24jfu/burden_dup_1.0.txt.gz"},
)

pipeline.add_task(
    "prepare_gnomad_v4_cnvs_track_percent_callable",
    prepare_cnv_track_callable,
    "/gnomad_v4/gnomad_v4_cnvs/cnv_tracks/track_percent_callable.ht",
    {"coverage_path": "gs://gnomad-v4-cnvs/2023-10-24jfu/track_percent_callable.tsv.gz"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "cnvs": "prepare_gnomad_v4_cnvs",
        "public_cnvs": "prepare_public_gnomad_v4_cnvs",
        "del_burden": "prepare_gnomad_v4_del_burden",
        "dup_burden": "prepare_gnomad_v4_dup_burden",
        "track_percent_callable": "prepare_gnomad_v4_cnvs_track_percent_callable",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

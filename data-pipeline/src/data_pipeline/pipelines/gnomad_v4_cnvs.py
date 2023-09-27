from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnvs import prepare_gnomad_v4_cnvs, add_variant_id_upper_case


pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_gnomad_v4_cnvs",
    prepare_gnomad_v4_cnvs,
    "/gnomad_v4/gnomad_v4_cnvs/v4_cnvs_step_1.ht",
    {
        "vcf_path": "gs://gnomad-v4-cnvs/2023-09-07-jfu-test4/GNOMAD_V4.4.3_browser_prototype_1.1.vcf.gz",
    },
)

pipeline.add_task(
    "add_variant_id_upper_case",
    add_variant_id_upper_case,
    "/gnomad_v4/gnomad_v4_cnvs/v4_cnvs_step_2.ht",
    {
        "cnvs_path": pipeline.get_task("prepare_gnomad_v4_cnvs"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"cnvs_step_1": "prepare_gnomad_v4_cnvs", "cnvs": "add_variant_id_upper_case"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

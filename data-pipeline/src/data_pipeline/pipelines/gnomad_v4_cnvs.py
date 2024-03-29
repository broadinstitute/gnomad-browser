from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnvs import prepare_gnomad_v4_cnvs


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

###############################################
# Outputs
###############################################

pipeline.set_outputs({"cnvs": "prepare_gnomad_v4_cnvs"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

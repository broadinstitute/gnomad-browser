from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_cnvs import prepare_gnomad_v4_cnvs, prepare_public_gnomad_v4_cnvs

pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_gnomad_v4_cnvs",
    prepare_gnomad_v4_cnvs,
    "/gnomad_v4/gnomad_v4_cnvs/cnvs.ht",
    {"vcf_path": "gs://gcp-public-data--gnomad/release/4.1/exome_cnv/gnomad.v4.1.cnv.all.vcf.gz"},
)

pipeline.add_task(
    "prepare_public_gnomad_v4_cnvs",
    prepare_public_gnomad_v4_cnvs,
    "/gnomad_v4/gnomad_v4_cnvs/gnomad.v4.1.cnv.all.ht",
    {"input_path": pipeline.get_task("prepare_gnomad_v4_cnvs")},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "cnvs": "prepare_gnomad_v4_cnvs",
        "public_cnvs": "prepare_public_gnomad_v4_cnvs",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

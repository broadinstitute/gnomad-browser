from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_local_ancestry import prepare_local_ancestry


pipeline = Pipeline()

###############################################
# Local ancestry inference
###############################################

pipeline.add_task(
    "prepare_local_ancestry",
    prepare_local_ancestry,
    "/gnomad_v3/local_ancestry.ht",
    {
        "path": "gs://gnomad-public-requester-pays/release/3.1/local_ancestry/genomes/gnomad.genomes.v3.1.local_ancestry.amr.vcf.bgz"
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"local_ancestry": "prepare_local_ancestry"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

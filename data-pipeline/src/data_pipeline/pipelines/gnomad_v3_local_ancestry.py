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
        "sources": [
            {
                "path": "gs://gcp-public-data--gnomad/release/3.1/local_ancestry/genomes/gnomad.genomes.v3.1.local_ancestry.amr.vcf.bgz",
                "ancestry_group_id": "amr",
                "local_ancestry_group_keys": [
                    ("african", "Africa"),
                    ("amerindigenous", "Amerindigenous"),
                    ("european", "Europe"),
                ],
            },
            {
                # Path to be changed when this file goes in a public bucket
                "path": "gs://gnomad-browser-data-pipeline/phil-scratch/gnomad.genomes.v3.1.local_ancestry.afr.vcf.bgz",
                "ancestry_group_id": "afr",
                "local_ancestry_group_keys": [
                    ("african", "Africa"),
                    ("european", "Europe"),
                ],
            },
        ]
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

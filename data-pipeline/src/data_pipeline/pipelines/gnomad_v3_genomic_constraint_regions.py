from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_genomic_constraint_regions import (
    prepare_gnomad_v3_genomic_constraint_regions,
)

pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v3_genomic_constraint_regions",
    prepare_gnomad_v3_genomic_constraint_regions,
    "/constraint/gnomad_v3_genomic_constraint_regions.ht",
    {
        "genomic_constraint_region_table_path": "gs://gcp-public-data--gnomad/release/3.1/secondary_analyses/genomic_constraint/constraint_z_genome_1kb.qc.download.txt.gz"
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"gnomad_v3_genomic_constraint_regions": "prepare_gnomad_v3_genomic_constraint_regions"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v3.gnomad_v3_mitochondrial_coverage import prepare_mitochondrial_coverage


pipeline = Pipeline()

pipeline.add_task(
    "prepare_mitochondrial_coverage",
    prepare_mitochondrial_coverage,
    "/mitochondria/mitochondria_genome_coverage.ht",
    {"coverage_path": "gs://gcp-public-data--gnomad/release/3.1/coverage/genomes/gnomad.genomes.v3.1.chrM.coverage.ht"},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"coverage": "prepare_mitochondrial_coverage"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage import prepare_coverage


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v3_coverage",
    prepare_coverage,
    "/gnomad_v3/gnomad_v3_genome_coverage.ht",
    {"coverage_path": "gs://gcp-public-data--gnomad/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht"},
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

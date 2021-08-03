from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage import prepare_coverage


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v2_exome_coverage",
    prepare_coverage,
    "/gnomad_v2/gnomad_v2_exome_coverage.ht",
    {"coverage_path": "gs://gcp-public-data--gnomad/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht"},
)

pipeline.add_task(
    "prepare_gnomad_v2_genome_coverage",
    prepare_coverage,
    "/gnomad_v2/gnomad_v2_genome_coverage.ht",
    {"coverage_path": "gs://gcp-public-data--gnomad/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht",},
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

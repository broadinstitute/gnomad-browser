from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage_v4 import prepare_coverage


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_exome_coverage",
    prepare_coverage,
    "/gnomad_v4_coverage_test_2023-10-12-1142/gnomad_v4_exome_coverage.ht",
    {
        "coverage_path": "gs://gnomad-v4-coverage-testing/release/4.0/ht/exomes/gnomad.exomes.v4.0.coverage.ht",
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"exome_coverage": "prepare_gnomad_v4_exome_coverage"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

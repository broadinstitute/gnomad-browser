from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage import prepare_coverage


pipeline = Pipeline()

pipeline.add_task(
    name="prepare_gnomad_v4_exome_coverage",
    task_function=prepare_coverage,
    output_path="/gnomad_v4/gnomad_v4_exome_coverage.ht",
    inputs={
        "coverage_path": "gs://gnomad-v4-coverage-testing/release/4.0/ht/exomes/gnomad.exomes.v4.0.coverage.ht",
    },
    params={"filter_intervals": ["chr1:55039447-55064852"]},
)

pipeline.add_task(
    name="prepare_gnomad_v4_genome_coverage",
    task_function=prepare_coverage,
    output_path="/gnomad_v4/gnomad_v4_genome_coverage.ht",
    # Using v3 coverage as mock for now
    inputs={
        "coverage_path": "gs://gcp-public-data--gnomad/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht",
    },
    params={"filter_intervals": ["chr1:55039447-55064852"]},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "exome_coverage": "prepare_gnomad_v4_exome_coverage",
        "genome_coverage": "prepare_gnomad_v4_genome_coverage",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

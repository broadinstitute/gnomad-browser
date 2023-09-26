from data_pipeline.pipeline import Pipeline, run_pipeline
from data_pipeline.config import PipelineConfig

from data_pipeline.data_types.coverage import prepare_coverage


pipeline = Pipeline(
    config=PipelineConfig.create(name="gnomad_v4_variants", input_root="data_in", output_root="data_out")
)

pipeline.add_task(
    name="prepare_gnomad_v4_exome_coverage",
    task_function=prepare_coverage,
    output_path="/gnomad_v4/gnomad_v4_exome_coverage.ht",
    # Using v3 coverage as mock for now
    inputs={
        "coverage_path": "gs://gcp-public-data--gnomad/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht",
    },
    params={"filter_intervals": ["chr1:10030-10150"]},
)

pipeline.add_task(
    name="prepare_gnomad_v4_genome_coverage",
    task_function=prepare_coverage,
    output_path="/gnomad_v4/gnomad_v4_genome_coverage.ht",
    # Using v3 coverage as mock for now
    inputs={
        "coverage_path": "gs://gcp-public-data--gnomad/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht",
    },
    params={"filter_intervals": ["chr1:10030-10150"]},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {"exome_coverage": "prepare_gnomad_v4_exome_coverage", "genome_coverage": "prepare_gnomad_v4_genome_coverage"}
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

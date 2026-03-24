from data_pipeline.config import PipelineConfig
from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.long_read.long_read_haplotypes import prepare_long_read_haplotypes
from data_pipeline.datasets.long_read.long_read_methylation import prepare_long_read_methylation

pipeline_name = "long_read"

output_sub_dir = "long_read"

config = PipelineConfig(
    name=pipeline_name,
    input_root="gs://gnomad-v4-data-pipeline/input",
    output_root="gs://gnomad-v4-data-pipeline/output",
)

pipeline = Pipeline(config=config)

pipeline.add_task(
    name="prepare_long_read_haplotypes",
    task_function=prepare_long_read_haplotypes,
    output_path=f"{output_sub_dir}/long_read_haplotypes.ht",
    inputs={
        "mt_path": "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/chr1-HPRC-test-data.mt"
    },
)

pipeline.add_task(
    name="prepare_long_read_methylation",
    task_function=prepare_long_read_methylation,
    output_path=f"{output_sub_dir}/long_read_methylation.ht",
    inputs={
        "bedgraph_paths": "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/methylation/*.bedgraph"
    },
)

pipeline.set_outputs(
    {
        "haplotypes": "prepare_long_read_haplotypes",
        "methylation": "prepare_long_read_methylation",
    }
)

if __name__ == "__main__":
    run_pipeline(pipeline)

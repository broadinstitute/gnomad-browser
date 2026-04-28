from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage import prepare_coverage

output_sub_dir = "gnomad_v4_lr"

pipeline = Pipeline()

pipeline.add_task(
    name="prepare_gnomad_v4_lr_coverage",
    task_function=prepare_coverage,
    output_path=f"/{output_sub_dir}/gnomad_v4_lr_coverage.ht",
    inputs={
        "coverage_path": "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc.coverage.tsv.gz"
    },
)


###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "coverage": "prepare_gnomad_v4_lr_coverage",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

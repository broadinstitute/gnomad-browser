from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.exac.exac_coverage import import_exac_coverage


pipeline = Pipeline()

pipeline.add_task(
    "import_exac_coverage", import_exac_coverage, "/exac/exac_coverage.ht",
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"exome_coverage": "import_exac_coverage"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

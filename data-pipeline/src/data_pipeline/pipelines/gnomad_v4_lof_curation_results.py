from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v2.gnomad_v2_lof_curation import import_gnomad_lof_curation_results

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v4_lof_curation_results",
    import_gnomad_lof_curation_results,
    "/gnomad_v4/gnomad_v4_lof_curation_results.ht",
    {"genes_path": genes_pipeline.get_output("genes_grch38")},
    {
        # If a result for a variant/gene pair is present in more than one file,
        # the result in the first file in this list takes precedence.
        "curation_result_paths": [
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v4/gnomAD_incomplete_penetrance_final_results.csv",
        ],
        "reference_genome": "GRCh38",
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"lof_curation_results": "prepare_gnomad_v4_lof_curation_results"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

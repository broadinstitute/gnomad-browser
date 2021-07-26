from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v2.gnomad_v2_lof_curation import import_gnomad_v2_lof_curation_results

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v2_lof_curation_results",
    import_gnomad_v2_lof_curation_results,
    "/gnomad_v2/gnomad_v2_lof_curation_results.ht",
    {"genes_path": genes_pipeline.get_task("prepare_grch37_genes")},
    {
        # If a result for a variant/gene pair is present in more than one file, the result in the first file in this list takes precedence.
        "curation_result_paths": [
            "gs://gnomad-public/truth-sets/source/lof-curation/metabolic_conditions_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/haploinsufficient_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/AP4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/FIG4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/MCOLN1_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/all_homozygous_curation_results.csv",
        ]
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

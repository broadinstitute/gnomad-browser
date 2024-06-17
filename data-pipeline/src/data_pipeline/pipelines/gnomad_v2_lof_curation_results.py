from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v2.gnomad_v2_lof_curation import import_gnomad_v2_lof_curation_results

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v2_lof_curation_results",
    import_gnomad_v2_lof_curation_results,
    "/gnomad_v2/gnomad_v2_lof_curation_results.ht",
    {"genes_path": genes_pipeline.get_output("genes_grch37")},
    {
        # If a result for a variant/gene pair is present in more than one file,
        # the result in the first file in this list takes precedence.
        "curation_result_paths": [
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/ABCC8_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/ADA2_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/CBS_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/CFTR_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/EYS_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/GAMT_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/GBE1_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/HADH_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/HPS1_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/HPS3_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/HPS4_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/MFSD8_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/PCDH15_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/PLA2G6_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/POLR3A_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/POLR3B_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/POMGNT1_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/SEPN1_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/SLC13A5_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/SMARCB1_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/SMC3_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/TANGO2_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/WWOX_final_results_gnomAD.csv",
            "gs://gnomad-v4-data-pipeline/inputs/lof_curation/gnomAD_v2/gnomAD_chets_final_results_gnomAD.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/NSD1_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/gnomAD_addendum_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/metabolic_conditions_genes_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/haploinsufficient_genes_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/AP4_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/FIG4_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/MCOLN1_curation_results.csv",
            "gs://gcp-public-data--gnomad/truth-sets/source/lof-curation/all_homozygous_curation_results.csv",
        ]
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"lof_curation_results": "prepare_gnomad_v2_lof_curation_results"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

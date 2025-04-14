from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_sv_v3 import (
    import_svs_from_vcfs,
    annotate_with_histograms,
    add_variant_id_upper_case,
    prepare_public_structural_variants,
)


pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "import_svs_from_vcfs",
    import_svs_from_vcfs,
    "/gnomad_sv_v3/structural_variants_step_1.ht",
    {},
    {"vcf_path": ["gs://gnomad-browser-data-pipeline/phil-scratch/gnomAD_SV_v3.release_4_1.sites_only.vcf.gz"]},
)

pipeline.add_task(
    "add_histograms",
    annotate_with_histograms,
    "/gnomad_sv_v3/structural_variants_step_2.ht",
    {
        "svs_path": pipeline.get_task("import_svs_from_vcfs"),
        "histograms_path": "gs://gnomad-browser-data-pipeline/phil-scratch/gnomad_sv_v3.age_and_gq_hists.ht",
    },
)

pipeline.add_task(
    "add_variant_id_upper_case",
    add_variant_id_upper_case,
    "/gnomad_sv_v3/structural_variants_step_3.ht",
    {
        "svs_path": pipeline.get_task("add_histograms"),
    },
)

pipeline.add_task(
    "prepare_public_structural_variants",
    prepare_public_structural_variants,
    "/gnomad_sv_v3/gnomad.v4.1.sv.sites.ht",
    {"input_path": pipeline.get_task("add_histograms")},
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "structural_variants": "add_variant_id_upper_case",
        "public_structural_variants": "prepare_public_structural_variants",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_sv_v3 import (
    import_all_svs_from_vcfs,
    annotate_with_histograms,
    add_variant_id_upper_case,
)


pipeline = Pipeline()

# TK permanent home for these
vcf_path_template = (
    "gs://gnomadev-data-pipeline-output/pwd-2022-12-06/external_sources/gnomad_v3_SV/gnomAD.v3.SV.chr{id}.vcf.gz"
)

autosome_ids = list(range(1, 23))
allosome_ids = ["X", "Y"]

autosome_vcf_paths = list(
    map(
        lambda id: vcf_path_template.format(id=id),
        autosome_ids,
    )
)

allosome_vcf_paths = list(
    map(
        lambda id: vcf_path_template.format(id=id),
        allosome_ids,
    )
)
###############################################
# Variants
###############################################

pipeline.add_task(
    "import_all_svs_from_vcfs",
    import_all_svs_from_vcfs,
    "/gnomad_sv_v3/structural_variants_step_1.ht",
    {},
    {
        "autosome_vcf_paths": autosome_vcf_paths,
        "allosome_vcf_paths": allosome_vcf_paths,
    },
)

pipeline.add_task(
    "add_histograms",
    annotate_with_histograms,
    "/gnomad_sv_v3/structural_variants_step_2.ht",
    {
        "svs_path": pipeline.get_task("import_all_svs_from_vcfs"),
        "histograms_path": "gs://gnomadev-data-pipeline-output/pwd-2022-12-06/external_sources/gnomad_sv_v3.age_and_gq_hists.ht",
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

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "structural_variants_step_1": "import_all_svs_from_vcfs",
        "structural_variants_step_2": "add_histograms",
        "structural_variants": "add_variant_id_upper_case",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

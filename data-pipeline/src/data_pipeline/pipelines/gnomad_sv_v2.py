from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_sv_v2 import prepare_gnomad_structural_variants


pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_structural_variants",
    prepare_gnomad_structural_variants,
    "/gnomad_sv_v2/structural_variants.ht",
    {
        "vcf_path": "gs://gcp-public-data--gnomad/papers/2019-sv/gnomad_v2.1_sv.sites.vcf.gz",
        "controls_vcf_path": "gs://gcp-public-data--gnomad/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.vcf.gz",
        "non_neuro_vcf_path": "gs://gcp-public-data--gnomad/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.vcf.gz",
        "histograms_path": "gs://gcp-public-data--gnomad/papers/2019-sv/gnomad_sv_hists.ht",
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.variants.gnomad_structural_variants import (
    prepare_gnomad_structural_variants,
    collect_structural_variants_by_gene,
)


staging_path = config.staging_path.rstrip("/")

variants_pipeline = Pipeline()

variants_pipeline.add_task(
    "prepare_structural_variants",
    prepare_gnomad_structural_variants,
    staging_path + "/variants/structural_variants.ht",
    {
        "vcf_path": "gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.sites.vcf.gz",
        "controls_vcf_path": "gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.vcf.gz",
        "non_neuro_vcf_path": "gs://gnomad-public/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.vcf.gz",
        "histograms_path": "gs://gnomad-public/papers/2019-sv/gnomad_sv_hists.ht",
    },
)

variants_pipeline.add_task(
    "collect_structural_variants_by_gene",
    collect_structural_variants_by_gene,
    staging_path + "/variants/structural_variants_by_gene.ht",
    {"structural_variants_path": variants_pipeline.get_task("prepare_structural_variants").output_path},
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    args = parse_pipeline_args(variants_pipeline)

    import hail as hl

    hl.init()

    variants_pipeline.run(**args)

from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.variants.rsids import collect_rsids

from data_pipeline.pipelines.gnomad_v3_variants import variants_pipeline as gnomad_v3_variants_pipeline
from data_pipeline.pipelines.gnomad_v2_variants import variants_pipeline as gnomad_v2_variants_pipeline
from data_pipeline.pipelines.exac_variants import variants_pipeline as exac_variants_pipeline


staging_path = config.staging_path.rstrip("/")

variants_pipeline = Pipeline()

variants_pipeline.add_task(
    "collect_rsids",
    collect_rsids,
    staging_path + "/variants/rsids.ht",
    {
        "variants_paths": [
            gnomad_v3_variants_pipeline.get_task("prepare_gnomad_v3_variants").output_path,
            gnomad_v2_variants_pipeline.get_task("prepare_gnomad_v2_variants").output_path,
            exac_variants_pipeline.get_task("import_exac_vcf").output_path,
        ]
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    args = parse_pipeline_args(variants_pipeline)

    import hail as hl

    hl.init()

    variants_pipeline.run(**args)

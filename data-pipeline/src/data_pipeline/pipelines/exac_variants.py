from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.variants.annotate_transcript_consequences import annotate_transcript_consequences
from data_pipeline.variants.exac_variants import import_exac_vcf

from data_pipeline.pipelines.gene_models import gene_models_pipeline


staging_path = config.staging_path.rstrip("/")

variants_pipeline = Pipeline()

variants_pipeline.add_task(
    "import_exac_vcf",
    import_exac_vcf,
    staging_path + "/variants/exac_variants.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz"},
)

variants_pipeline.add_task(
    "annotate_exac_transcript_consequences",
    annotate_transcript_consequences,
    staging_path + "/variants/exac_variants_annotated_1.ht",
    {
        "variants_path": variants_pipeline.get_task("import_exac_vcf").output_path,
        "transcript_models_path": gene_models_pipeline.get_task("extract_grch37_transcripts").output_path,
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

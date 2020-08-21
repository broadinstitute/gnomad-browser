import argparse

from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline

from data_pipeline.variants.annotate_transcript_consequences import annotate_transcript_consequences
from data_pipeline.clinvar_variants import prepare_clinvar_variants

from data_pipeline.pipelines.gene_models import gene_models_pipeline


staging_path = config.staging_path.rstrip("/")

###############################################
# GRCh37
###############################################

clinvar_grch37_variants_pipeline = Pipeline()

clinvar_grch37_variants_pipeline.add_download_task(
    "download_clinvar_grch37_vcf",
    "ftp://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh37/clinvar.vcf.gz",
    staging_path + "/external_sources/clinvar_grch37.vcf.gz",
)

clinvar_grch37_variants_pipeline.add_task(
    "prepare_clinvar_grch37_variants",
    prepare_clinvar_variants,
    staging_path + "/variants/clinvar_grch37.ht",
    {"vcf_path": clinvar_grch37_variants_pipeline.get_task("download_clinvar_grch37_vcf").output_path},
    {"reference_genome": "GRCh37"},
)

clinvar_grch37_variants_pipeline.add_task(
    "annotate_clinvar_grch37_transcript_consequences",
    annotate_transcript_consequences,
    staging_path + "/variants/clinvar_grch37_annotated.ht",
    {
        "variants_path": clinvar_grch37_variants_pipeline.get_task("prepare_clinvar_grch37_variants").output_path,
        "transcript_models_path": gene_models_pipeline.get_task("extract_grch37_transcripts").output_path,
    },
)

###############################################
# GRCh38
###############################################

clinvar_grch38_variants_pipeline = Pipeline()

clinvar_grch38_variants_pipeline.add_download_task(
    "download_clinvar_grch38_vcf",
    "ftp://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz",
    staging_path + "/external_sources/clinvar_grch38.vcf.gz",
)

clinvar_grch38_variants_pipeline.add_task(
    "prepare_clinvar_grch38_variants",
    prepare_clinvar_variants,
    staging_path + "/variants/clinvar_grch38.ht",
    {"vcf_path": clinvar_grch38_variants_pipeline.get_task("download_clinvar_grch38_vcf").output_path},
    {"reference_genome": "GRCh38"},
)

clinvar_grch38_variants_pipeline.add_task(
    "annotate_clinvar_grch38_transcript_consequences",
    annotate_transcript_consequences,
    staging_path + "/variants/clinvar_grch38_annotated.ht",
    {
        "variants_path": clinvar_grch38_variants_pipeline.get_task("prepare_clinvar_grch38_variants").output_path,
        "transcript_models_path": gene_models_pipeline.get_task("extract_grch38_transcripts").output_path,
        "mane_transcripts_path": gene_models_pipeline.get_task("import_mane_select_transcripts").output_path,
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-genome", choices=("GRCh37", "GRCh38"), default="GRCh37")
    args = parser.parse_args()

    import hail as hl

    hl.init()
    if args.reference_genome == "GRCh37":
        clinvar_grch37_variants_pipeline.run()
    else:
        clinvar_grch38_variants_pipeline.run()

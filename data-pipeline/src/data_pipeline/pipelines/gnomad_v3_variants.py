from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.variants.annotate_transcript_consequences import annotate_transcript_consequences
from data_pipeline.variants.gnomad_v3_variants import prepare_gnomad_v3_variants

from data_pipeline.pipelines.gene_models import gene_models_pipeline


staging_path = config.staging_path.rstrip("/")

variants_pipeline = Pipeline()

variants_pipeline.add_task(
    "prepare_gnomad_v3_variants",
    prepare_gnomad_v3_variants,
    staging_path + "/variants/gnomad_v3_variants.ht",
    {"path": "gs://gnomad-public-requester-pays/release/3.0/ht/genomes/gnomad.genomes.r3.0.sites.ht"},
)

variants_pipeline.add_task(
    "annotate_gnomad_v3_transcript_consequences",
    annotate_transcript_consequences,
    staging_path + "/variants/gnomad_v3_variants_annotated_1.ht",
    {
        "variants_path": variants_pipeline.get_task("prepare_gnomad_v3_variants").output_path,
        "transcript_models_path": gene_models_pipeline.get_task("extract_grch38_transcripts").output_path,
        "mane_transcripts_path": gene_models_pipeline.get_task("import_mane_select_transcripts").output_path,
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

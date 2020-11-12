from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.mitochondria import prepare_mitochondrial_coverage, prepare_mitochondrial_variants

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_mitochondrial_variants",
    prepare_mitochondrial_variants,
    "/mitochondria/mitochondrial_variants_base.ht",
    {"path": "gs://gnomad-public-requester-pays/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.chrM.ht"},
)

pipeline.add_task(
    "annotate_mitochondrial_variant_transcript_consequences",
    annotate_transcript_consequences,
    "/mitochondria/mitochondrial_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("prepare_mitochondrial_variants"),
        "transcripts_path": genes_pipeline.get_task("extract_grch38_transcripts"),
        "mane_transcripts_path": genes_pipeline.get_task("import_mane_select_transcripts"),
    },
)

###############################################
# Coverage
###############################################

pipeline.add_task(
    "prepare_mitochondrial_coverage",
    prepare_mitochondrial_coverage,
    "/mitochondria/mitochondria_genome_coverage.ht",
    {
        "coverage_path": "gs://gnomad-public-requester-pays/release/3.1/coverage/genomes/gnomad.genomes.v3.1.chrM.coverage.ht"
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

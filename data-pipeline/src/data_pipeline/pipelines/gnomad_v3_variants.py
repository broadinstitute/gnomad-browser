from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.gnomad_v3.gnomad_v3_variants import prepare_gnomad_v3_variants

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "prepare_gnomad_v3_variants",
    prepare_gnomad_v3_variants,
    "/gnomad_v3/gnomad_v3_variants_base.ht",
    {"path": "gs://gnomad-public-requester-pays/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht"},
)

pipeline.add_task(
    "annotate_gnomad_v3_transcript_consequences",
    annotate_transcript_consequences,
    "/gnomad_v3/gnomad_v3_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("prepare_gnomad_v3_variants"),
        "transcripts_path": genes_pipeline.get_task("extract_grch38_transcripts"),
        "mane_transcripts_path": genes_pipeline.get_task("import_mane_select_transcripts"),
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

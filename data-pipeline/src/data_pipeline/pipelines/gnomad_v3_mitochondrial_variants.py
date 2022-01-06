from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.gnomad_v3.gnomad_v3_mitochondrial_variants import prepare_mitochondrial_variants

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "prepare_mitochondrial_variants",
    prepare_mitochondrial_variants,
    "/mitochondria/mitochondrial_variants_base.ht",
    {
        "path": "gs://gcp-public-data--gnomad/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.chrM.ht",
        "mnvs_path": "gs://gnomad-browser-data-pipeline/mt_mnvs.tsv",
    },
)

pipeline.add_task(
    "annotate_mitochondrial_variant_transcript_consequences",
    annotate_transcript_consequences,
    "/mitochondria/mitochondrial_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("prepare_mitochondrial_variants"),
        "transcripts_path": genes_pipeline.get_output("base_transcripts_grch38"),
        "mane_transcripts_path": genes_pipeline.get_output("mane_select_transcripts"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"variants": "annotate_mitochondrial_variant_transcript_consequences"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

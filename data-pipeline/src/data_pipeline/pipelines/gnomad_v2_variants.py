from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.gnomad_v2.gnomad_v2_mnvs import (
    prepare_gnomad_v2_mnvs,
    annotate_variants_with_mnvs,
    replace_quote_char,
)
from data_pipeline.datasets.gnomad_v2.gnomad_v2_variants import prepare_gnomad_v2_variants

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

###############################################
# MNVs
###############################################

pipeline.add_download_task(
    "download_mnvs",
    "https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_v0.tsv",
    "/gnomad_v2/gnomad_mnv_coding_v0.tsv",
)

pipeline.add_download_task(
    "download_3bp_mnvs",
    "https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_3bp_fullannotation.tsv",
    "/gnomad_v2/gnomad_mnv_coding_3bp_fullannotation.tsv",
)

pipeline.add_task(
    "replace_mnv_quote_char",
    replace_quote_char,
    "/gnomad_v2/gnomad_mnv_coding_v0-quoted.tsv",
    {"path": pipeline.get_task("download_mnvs")},
)

pipeline.add_task(
    "replace_3bp_mnv_quote_char",
    replace_quote_char,
    "/gnomad_v2/gnomad_mnv_coding_3bp_fullannotation-quoted.tsv",
    {"path": pipeline.get_task("download_3bp_mnvs")},
)

pipeline.add_task(
    "prepare_gnomad_v2_mnvs",
    prepare_gnomad_v2_mnvs,
    "/gnomad_v2/gnomad_v2_mnvs.ht",
    {
        "mnvs_path": pipeline.get_task("replace_mnv_quote_char"),
        "three_bp_mnvs_path": pipeline.get_task("replace_3bp_mnv_quote_char"),
    },
)

###############################################
# Variants
###############################################

pipeline.add_task(
    "prepare_gnomad_v2_variants",
    prepare_gnomad_v2_variants,
    "/gnomad_v2/gnomad_v2_variants_base.ht",
    {
        "exome_variants_path": "gs://gnomad-public-requester-pays/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "genome_variants_path": "gs://gnomad-public-requester-pays/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

pipeline.add_task(
    "annotate_gnomad_v2_variants_with_mnvs",
    annotate_variants_with_mnvs,
    "/gnomad_v2/gnomad_v2_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("prepare_gnomad_v2_variants"),
        "mnvs_path": pipeline.get_task("prepare_gnomad_v2_mnvs"),
    },
)

pipeline.add_task(
    "annotate_gnomad_v2_transcript_consequences",
    annotate_transcript_consequences,
    "/gnomad_v2/gnomad_v2_variants_annotated_2.ht",
    {
        "variants_path": pipeline.get_task("annotate_gnomad_v2_variants_with_mnvs"),
        "transcripts_path": genes_pipeline.get_task("extract_grch37_transcripts"),
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.coverage import prepare_coverage
from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.gnomad_v2.gnomad_v2_lof_curation import import_gnomad_v2_lof_curation_results
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
# LoF curation
###############################################

pipeline.add_task(
    "prepare_gnomad_v2_lof_curation_results",
    import_gnomad_v2_lof_curation_results,
    "/gnomad_v2/gnomad_v2_lof_curation_results.ht",
    {"genes_path": genes_pipeline.get_task("prepare_grch37_genes")},
    {
        # If a result for a variant/gene pair is present in more than one file, the result in the first file in this list takes precedence.
        "curation_result_paths": [
            "gs://gnomad-public/truth-sets/source/lof-curation/metabolic_conditions_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/haploinsufficient_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/AP4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/FIG4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/MCOLN1_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/all_homozygous_curation_results.csv",
        ]
    },
)

###############################################
# Coverage
###############################################

pipeline.add_task(
    "prepare_gnomad_v2_exome_coverage",
    prepare_coverage,
    "/gnomad_v2/gnomad_v2_exome_coverage.ht",
    {"coverage_path": "gs://gnomad-public-requester-pays/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht"},
)

pipeline.add_task(
    "prepare_gnomad_v2_genome_coverage",
    prepare_coverage,
    "/gnomad_v2/gnomad_v2_genome_coverage.ht",
    {
        "coverage_path": "gs://gnomad-public-requester-pays/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht",
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

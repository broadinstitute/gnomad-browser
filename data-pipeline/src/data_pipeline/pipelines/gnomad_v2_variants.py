import os
import tempfile

from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.annotate_table import annotate_table

from data_pipeline.variants.annotate_transcript_consequences import annotate_transcript_consequences
from data_pipeline.variants.gnomad_v2_lof_curation import import_gnomad_v2_lof_curation_results
from data_pipeline.variants.gnomad_v2_mnvs import prepare_gnomad_v2_mnvs, annotate_variants_with_mnvs
from data_pipeline.variants.gnomad_v2_variants import prepare_gnomad_v2_variants

from data_pipeline.pipelines.gene_models import gene_models_pipeline


staging_path = config.staging_path.rstrip("/")

variants_pipeline = Pipeline()

variants_pipeline.add_task(
    "prepare_gnomad_v2_variants",
    prepare_gnomad_v2_variants,
    staging_path + "/variants/gnomad_v2_variants.ht",
    {
        "exome_variants_path": "gs://gnomad-public-requester-pays/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "genome_variants_path": "gs://gnomad-public-requester-pays/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

variants_pipeline.add_download_task(
    "download_mnvs",
    "https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_v0.tsv",
    os.path.join(tempfile.gettempdir(), "gnomad_mnv_coding_v0.tsv"),
)

variants_pipeline.add_download_task(
    "download_3bp_mnvs",
    "https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_3bp_fullannotation.tsv",
    os.path.join(tempfile.gettempdir(), "gnomad_mnv_coding_3bp_fullannotation.tsv"),
)

# FIXME: this would always run because downloaded files are newer?
variants_pipeline.add_task(
    "prepare_gnomad_v2_mnvs",
    prepare_gnomad_v2_mnvs,
    staging_path + "/variants/gnomad_v2_mnvs.ht",
    {
        "mnvs_path": variants_pipeline.get_task("download_mnvs").output_path,
        "three_bp_mnvs_path": variants_pipeline.get_task("download_3bp_mnvs").output_path,
    },
)

variants_pipeline.add_task(
    "annotate_gnomad_v2_variants_with_mnvs",
    annotate_variants_with_mnvs,
    staging_path + "/variants/gnomad_v2_variants_annotated_1.ht",
    {
        "variants_path": variants_pipeline.get_task("prepare_gnomad_v2_variants").output_path,
        "mnvs_path": variants_pipeline.get_task("prepare_gnomad_v2_mnvs").output_path,
    },
)

variants_pipeline.add_task(
    "prepare_gnomad_v2_lof_curation_results",
    import_gnomad_v2_lof_curation_results,
    staging_path + "/variants/gnomad_v2_lof_curation_results.ht",
    {
        "gene_models_path": gene_models_pipeline.get_task("prepare_grch37_gene_models").output_path,
    },
    {
        "curation_result_paths": [
            "gs://gnomad-public/truth-sets/source/lof-curation/AP4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/FIG4_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/MCOLN1_curation_results.csv",
            "gs://gnomad-public/truth-sets/source/lof-curation/all_homozygous_curation_results.csv",
        ]
    }
)

variants_pipeline.add_task(
    "annotate_gnomad_v2_variants_with_lof_curation_results",
    annotate_table,
    staging_path + "/variants/gnomad_v2_variants_annotated_2.ht",
    {
        "table_path": variants_pipeline.get_task("annotate_gnomad_v2_variants_with_mnvs").output_path,
        "lof_curations": variants_pipeline.get_task("prepare_gnomad_v2_lof_curation_results").output_path,
    },
)

variants_pipeline.add_task(
    "annotate_gnomad_v2_transcript_consequences",
    annotate_transcript_consequences,
    staging_path + "/variants/gnomad_v2_variants_annotated_3.ht",
    {
        "variants_path": variants_pipeline.get_task("annotate_gnomad_v2_variants_with_lof_curation_results").output_path,
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

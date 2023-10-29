import hail as hl
from data_pipeline.config import PipelineConfig

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.helpers import annotate_table

from data_pipeline.data_types.gene import prepare_genes
from data_pipeline.data_types.canonical_transcript import get_canonical_transcripts
from data_pipeline.data_types.mane_select_transcript import import_mane_select_transcripts
from data_pipeline.data_types.transcript import (
    annotate_gene_transcripts_with_tissue_expression,
    annotate_gene_transcripts_with_refseq_id,
    extract_transcripts,
)
from data_pipeline.data_types.gtex_tissue_expression import prepare_gtex_expression_data
from data_pipeline.data_types.pext import prepare_pext_data

from data_pipeline.datasets.exac.exac_constraint import prepare_exac_constraint
from data_pipeline.datasets.exac.exac_regional_missense_constraint import prepare_exac_regional_missense_constraint
from data_pipeline.datasets.gnomad_v2.gnomad_v2_constraint import prepare_gnomad_v2_constraint
from data_pipeline.datasets.gnomad_v2.gnomad_v2_regional_missense_constraint import (
    prepare_gnomad_v2_regional_missense_constraint,
)

from data_pipeline.pipelines.variant_cooccurrence_counts import (
    annotate_table_with_variant_cooccurrence_counts,
    prepare_heterozygous_variant_cooccurrence_counts,
    prepare_homozygous_variant_cooccurrence_counts,
)
from data_pipeline.data_types.gene import reject_par_y_genes

pipeline = Pipeline(
    # PipelineConfig(
    #     name="genes",
    #     input_root="gs://gnomad-matt-data-pipeline/2023-10-19/inputs",
    #     output_root="gs://gnomad-matt-data-pipeline/2023-10-19/outputs",
    # )
)  # TODO: FIXME

###############################################
# Import GENCODE and HGNC files
###############################################

GENCODE_V19_URL = "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"
GENCODE_V39_URL = "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_39/gencode.v39.annotation.gtf.gz"

pipeline.add_download_task(
    "download_gencode_v19_gtf", GENCODE_V19_URL, "/external_sources/" + GENCODE_V19_URL.split("/")[-1]
)

pipeline.add_download_task(
    "download_gencode_v39_gtf", GENCODE_V39_URL, "/external_sources/" + GENCODE_V39_URL.split("/")[-1]
)

HGNC_COLUMNS = [
    "gd_hgnc_id",
    "gd_app_sym",
    "gd_app_name",
    "gd_prev_sym",
    "gd_aliases",
    "gd_pub_eg_id",
    "gd_pub_ensembl_id",
    "md_eg_id",
    "md_ensembl_id",
    "md_mim_id",
]

pipeline.add_download_task(
    "download_hgnc",
    f"https://www.genenames.org/cgi-bin/download/custom?{'&'.join('col=' + column for column in HGNC_COLUMNS)}&status=Approved&hgnc_dbtag=on&order_by=gd_app_sym_sort&format=text&submit=submit",  # noqa
    "/external_sources/hgnc.tsv",
)

pipeline.add_task(
    "prepare_grch37_genes",
    prepare_genes,
    "/genes/genes_grch37_base.ht",
    {"gencode_path": pipeline.get_task("download_gencode_v19_gtf"), "hgnc_path": pipeline.get_task("download_hgnc")},
    {"reference_genome": "GRCh37"},
)

pipeline.add_task(
    "prepare_grch38_genes",
    prepare_genes,
    "/genes/genes_grch38_base.ht",
    {"gencode_path": pipeline.get_task("download_gencode_v39_gtf"), "hgnc_path": pipeline.get_task("download_hgnc")},
    {"reference_genome": "GRCh38"},
)

###############################################
# MANE Select transcripts
###############################################

# Note: MANE Select transcripts are used to sort variant transcript consequences.
# If this URL is updated, all GRCh38 variants must be reloaded in
# Elasticsearch (gnomAD v3, mitochondrial variants, ClinVar GRCh38).
# Updating this file without reloading variants may result in
# an unexpected order of transcript consequences for some variants.
MANE_TRANSCRIPTS_URL = (
    "https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_0.95/MANE.GRCh38.v0.95.summary.txt.gz"
)

pipeline.add_download_task(
    "download_mane_transcripts",
    MANE_TRANSCRIPTS_URL,
    "/external_sources/" + MANE_TRANSCRIPTS_URL.split("/")[-1],
)

pipeline.add_task(
    "import_mane_select_transcripts",
    import_mane_select_transcripts,
    "/genes/mane_select_transcripts.ht",
    {"path": pipeline.get_task("download_mane_transcripts")},
)

###############################################
# Canonical transcripts
###############################################

pipeline.add_task(
    "get_grch37_canonical_transcripts",
    get_canonical_transcripts,
    "/genes/canonical_transcripts_grch37.ht",
    {
        "exomes": "gs://gcp-public-data--gnomad/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "genomes": "gs://gcp-public-data--gnomad/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

pipeline.add_task(
    "get_grch38_canonical_transcripts",
    get_canonical_transcripts,
    "/genes/canonical_transcripts_grch38.ht",
    {"genomes": "gs://gcp-public-data--gnomad/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht"},
)

###############################################
# Tissue expression
###############################################

pipeline.add_download_task(
    "download_gtex_v7_tpm_data",
    "https://storage.googleapis.com/gtex_analysis_v7/rna_seq_data/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz",
    "/external_sources/gtex/v7/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz",
)

pipeline.add_download_task(
    "download_gtex_v7_sample_attributes",
    "https://storage.googleapis.com/gtex_analysis_v7/annotations/GTEx_v7_Annotations_SampleAttributesDS.txt",
    "/external_sources/gtex/v7/GTEx_v7_Annotations_SampleAttributesDS.txt",
)

pipeline.add_task(
    "prepare_gtex_v7_expression_data",
    prepare_gtex_expression_data,
    "/gtex/gtex_v7_tissue_expression.ht",
    {
        "transcript_tpms_path": pipeline.get_task("download_gtex_v7_tpm_data"),
        "sample_annotations_path": pipeline.get_task("download_gtex_v7_sample_attributes"),
    },
    {"tmp_path": "/tmp"},
)

pipeline.add_task(
    "prepare_pext",
    prepare_pext_data,
    "/pext_grch37.ht",
    {
        "base_level_pext_path": "gs://gcp-public-data--gnomad/papers/2019-tx-annotation/gnomad_browser/all.baselevel.021620.ht",
        "low_max_pext_genes_path": "gs://gcp-public-data--gnomad/papers/2019-tx-annotation/data/GRCH37_hg19/max_pext_low_genes.021520.tsv",
    },
)

###############################################
# Constraint
###############################################

pipeline.add_task(
    "prepare_exac_constraint",
    prepare_exac_constraint,
    "/constraint/exac_constraint.ht",
    {
        "path": "gs://gcp-public-data--gnomad/legacy/exac_browser/forweb_cleaned_exac_r03_march16_z_data_pLI_CNV-final.txt.gz"
    },
)

pipeline.add_task(
    "prepare_exac_regional_missense_constraint",
    prepare_exac_regional_missense_constraint,
    "/constraint/exac_regional_missense_constraint.ht",
    {"path": "gs://gcp-public-data--gnomad/legacy/exac_browser/regional_missense_constraint.tsv"},
)

pipeline.add_task(
    "prepare_gnomad_v2_constraint",
    prepare_gnomad_v2_constraint,
    "/constraint/gnomad_v2_constraint.ht",
    {"path": "gs://gcp-public-data--gnomad/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.ht"},
)

pipeline.add_task(
    "prepare_heterozygous_variant_cooccurrence_counts",
    prepare_heterozygous_variant_cooccurrence_counts,
    "/genes/heterozygous_variant_cooccurrence_counts.ht",
)

pipeline.add_task(
    "prepare_homozygous_variant_cooccurrence_counts",
    prepare_homozygous_variant_cooccurrence_counts,
    "/genes/homozygous_variant_cooccurrence_counts.ht",
)

pipeline.add_task(
    "prepare_gnomad_v2_regional_missense_constraint",
    prepare_gnomad_v2_regional_missense_constraint,
    "/constraint/gnomad_v2_regional_missense_constraint.ht",
    # TODO: before merging - update to a more permanent location for this data
    {"path": "gs://gnomad-rgrant-data-pipeline/output/constraint/20230926_rmc_demo"},
)

###############################################
# Annotate genes
###############################################

pipeline.add_task(
    "annotate_grch37_genes_step_1",
    annotate_table,
    "/genes/genes_grch37_annotated_1.ht",
    {
        "table_path": pipeline.get_task("prepare_grch37_genes"),
        "canonical_transcript": pipeline.get_task("get_grch37_canonical_transcripts"),
        "pext": pipeline.get_task("prepare_pext"),
    },
)

pipeline.add_task(
    "annotate_grch37_genes_step_2",
    annotate_gene_transcripts_with_tissue_expression,
    "/genes/genes_grch37_annotated_2.ht",
    {
        "table_path": pipeline.get_task("annotate_grch37_genes_step_1"),
        "gtex_tissue_expression_path": pipeline.get_task("prepare_gtex_v7_expression_data"),
    },
)


def annotate_with_preferred_transcript(table_path):
    ds = hl.read_table(table_path)

    if "mane_select_transcript" in ds.row:
        preferred_transcript_id = hl.or_else(ds.mane_select_transcript.ensembl_id, ds.canonical_transcript_id)
        preferred_transcript_source = "mane_select"
    else:
        preferred_transcript_id = ds.canonical_transcript_id
        preferred_transcript_source = "ensembl_canonical"

    return ds.annotate(
        preferred_transcript_id=preferred_transcript_id, preferred_transcript_source=preferred_transcript_source
    )


pipeline.add_task(
    "annotate_grch37_genes_step_3",
    annotate_with_preferred_transcript,
    "/genes/genes_grch37_annotated_3.ht",
    {"table_path": pipeline.get_task("annotate_grch37_genes_step_2")},
)

pipeline.add_task(
    "annotate_grch37_genes_step_4",
    annotate_table,
    "/genes/genes_grch37_annotated_4.ht",
    {
        "table_path": pipeline.get_task("annotate_grch37_genes_step_3"),
        "exac_constraint": pipeline.get_task("prepare_exac_constraint"),
        "exac_regional_missense_constraint": pipeline.get_task("prepare_exac_regional_missense_constraint"),
        "gnomad_constraint": pipeline.get_task("prepare_gnomad_v2_constraint"),
        "gnomad_v2_regional_missense_constraint": pipeline.get_task("prepare_gnomad_v2_regional_missense_constraint"),
    },
    {"join_on": "preferred_transcript_id"},
)

pipeline.add_task(
    "annotate_grch37_genes_step_5",
    annotate_table_with_variant_cooccurrence_counts,
    "/genes/genes_grch37_annotated_5.ht",
    {
        "genes_path": pipeline.get_task("annotate_grch37_genes_step_4"),
        "heterozygous_variant_cooccurrence_counts_path": pipeline.get_task(
            "prepare_heterozygous_variant_cooccurrence_counts"
        ),
        "homozygous_variant_cooccurrence_counts_path": pipeline.get_task(
            "prepare_homozygous_variant_cooccurrence_counts"
        ),
    },
)

pipeline.add_task(
    "annotate_grch38_genes_step_1",
    annotate_table,
    "/genes/genes_grch38_annotated_1.ht",
    {
        "table_path": pipeline.get_task("prepare_grch38_genes"),
        "canonical_transcript": pipeline.get_task("get_grch38_canonical_transcripts"),
        "mane_select_transcript": pipeline.get_task("import_mane_select_transcripts"),
    },
)

pipeline.add_task(
    "annotate_grch38_genes_step_2",
    annotate_gene_transcripts_with_refseq_id,
    "/genes/genes_grch38_annotated_2.ht",
    {
        "table_path": pipeline.get_task("annotate_grch38_genes_step_1"),
        "mane_select_transcripts_path": pipeline.get_task("import_mane_select_transcripts"),
    },
)

pipeline.add_task(
    "annotate_grch38_genes_step_3",
    annotate_with_preferred_transcript,
    "/genes/genes_grch38_annotated_3.ht",
    {"table_path": pipeline.get_task("annotate_grch38_genes_step_2")},
)

pipeline.add_task(
    "annotate_grch38_genes_step_4",
    annotate_table_with_variant_cooccurrence_counts,
    "/genes/genes_grch38_annotated_4.ht",
    {
        "genes_path": pipeline.get_task("annotate_grch38_genes_step_3"),
        "heterozygous_variant_cooccurrence_counts_path": pipeline.get_task(
            "prepare_heterozygous_variant_cooccurrence_counts"
        ),
        "homozygous_variant_cooccurrence_counts_path": pipeline.get_task(
            "prepare_homozygous_variant_cooccurrence_counts"
        ),
    },
)

pipeline.add_task(
    "annotate_grch38_genes_step_5",
    reject_par_y_genes,
    "/genes/genes_grch38_annotated_5.ht",
    {
        "genes_path": pipeline.get_task("annotate_grch38_genes_step_4"),
    },
)

###############################################
# Extract transcripts
###############################################

pipeline.add_task(
    "extract_grch37_transcripts",
    extract_transcripts,
    "/genes/transcripts_grch37_base.ht",
    {"genes_path": pipeline.get_task("annotate_grch37_genes_step_4")},
)

pipeline.add_task(
    "extract_grch38_transcripts",
    extract_transcripts,
    "/genes/transcripts_grch38_base.ht",
    {"genes_path": pipeline.get_task("annotate_grch38_genes_step_3")},
)

###############################################
# Annotate transcripts
###############################################

pipeline.add_task(
    "annotate_grch37_transcripts",
    annotate_table,
    "/genes/transcripts_grch37_annotated_1.ht",
    {
        "table_path": pipeline.get_task("extract_grch37_transcripts"),
        "exac_constraint": pipeline.get_task("prepare_exac_constraint"),
        "gnomad_constraint": pipeline.get_task("prepare_gnomad_v2_constraint"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "genes_grch37": "annotate_grch37_genes_step_5",
        "genes_grch38": "annotate_grch38_genes_step_5",
        "base_transcripts_grch37": "extract_grch37_transcripts",
        "base_transcripts_grch38": "extract_grch38_transcripts",
        "transcripts_grch37": "annotate_grch37_transcripts",
        "transcripts_grch38": "extract_grch38_transcripts",
        "mane_select_transcripts": "import_mane_select_transcripts",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

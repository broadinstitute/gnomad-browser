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


pipeline = Pipeline()

###############################################
# Import GENCODE and HGNC files
###############################################

GENCODE_V19_URL = "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"
GENCODE_V35_URL = "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_35/gencode.v35.annotation.gtf.gz"

pipeline.add_download_task(
    "download_gencode_v19_gtf", GENCODE_V19_URL, "/external_sources/" + GENCODE_V19_URL.split("/")[-1]
)

pipeline.add_download_task(
    "download_gencode_v35_gtf", GENCODE_V35_URL, "/external_sources/" + GENCODE_V35_URL.split("/")[-1]
)

pipeline.add_download_task(
    "download_hgnc_names",
    "https://www.genenames.org/cgi-bin/download/custom?col=gd_hgnc_id&col=gd_app_sym&col=gd_app_name&col=gd_prev_sym&col=gd_aliases&col=gd_pub_ensembl_id&col=md_ensembl_id&col=md_mim_id&status=Approved&hgnc_dbtag=on&order_by=gd_app_sym_sort&format=text&submit=submit",
    "/external_sources/hgnc.tsv",
)

pipeline.add_task(
    "prepare_grch37_genes",
    prepare_genes,
    "/genes/genes_grch37_base.ht",
    {
        "gencode_path": pipeline.get_task("download_gencode_v19_gtf"),
        "hgnc_path": pipeline.get_task("download_hgnc_names"),
    },
    {"reference_genome": "GRCh37"},
)

pipeline.add_task(
    "prepare_grch38_genes",
    prepare_genes,
    "/genes/genes_grch38_base.ht",
    {
        "gencode_path": pipeline.get_task("download_gencode_v35_gtf"),
        "hgnc_path": pipeline.get_task("download_hgnc_names"),
    },
    {"reference_genome": "GRCh38"},
)

###############################################
# MANE Select transcripts
###############################################

MANE_SELECT_TRANSCRIPTS_URL = (
    "https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_0.8/MANE.GRCh38.v0.8.summary.txt.gz"
)

pipeline.add_download_task(
    "download_mane_select_transcripts",
    MANE_SELECT_TRANSCRIPTS_URL,
    "/external_sources/" + MANE_SELECT_TRANSCRIPTS_URL.split("/")[-1],
)

pipeline.add_task(
    "import_mane_select_transcripts",
    import_mane_select_transcripts,
    "/genes/mane_select_transcripts.ht",
    {"path": pipeline.get_task("download_mane_select_transcripts")},
)

###############################################
# Canonical transcripts
###############################################

pipeline.add_task(
    "get_grch37_canonical_transcripts",
    get_canonical_transcripts,
    "/genes/canonical_transcripts_grch37.ht",
    {
        "exomes": "gs://gnomad-public-requester-pays/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "genomes": "gs://gnomad-public-requester-pays/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

pipeline.add_task(
    "get_grch38_canonical_transcripts",
    get_canonical_transcripts,
    "/genes/canonical_transcripts_grch38.ht",
    {"genomes": "gs://gnomad-public-requester-pays/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.ht"},
)

###############################################
# Tissue expression
###############################################

pipeline.add_task(
    "prepare_gtex_v7_expression_data",
    prepare_gtex_expression_data,
    "/gtex/gtex_v7_tissue_expression.ht",
    {
        "transcript_tpms_path": "gs://gtex_analysis_v7/rna_seq_data/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz",
        "sample_annotations_path": "gs://gtex_analysis_v7/annotations/GTEx_v7_Annotations_SampleAttributesDS.txt",
        "tmp_path": "/tmp",
    },
)

pipeline.add_task(
    "prepare_pext",
    prepare_pext_data,
    "/pext_grch37.ht",
    {
        "base_level_pext_path": "gs://gnomad-public/papers/2019-tx-annotation/gnomad_browser/all.baselevel.021620.ht",
        "low_max_pext_genes_path": "gs://gnomad-public/papers/2019-tx-annotation/data/GRCH37_hg19/max_pext_low_genes.021520.tsv",
    },
)

###############################################
# Constraint
###############################################

pipeline.add_task(
    "prepare_exac_constraint",
    prepare_exac_constraint,
    "/constraint/exac_constraint.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/forweb_cleaned_exac_r03_march16_z_data_pLI_CNV-final.txt.gz"},
)

pipeline.add_task(
    "prepare_exac_regional_missense_constraint",
    prepare_exac_regional_missense_constraint,
    "/constraint/exac_regional_missense_constraint.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/regional_missense_constraint.tsv"},
)

pipeline.add_task(
    "prepare_gnomad_v2_constraint",
    prepare_gnomad_v2_constraint,
    "/constraint/gnomad_v2_constraint.ht",
    {"path": "gs://gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.ht"},
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

pipeline.add_task(
    "annotate_grch37_genes_step_3",
    annotate_table,
    "/genes/genes_grch37_annotated_3.ht",
    {
        "table_path": pipeline.get_task("annotate_grch37_genes_step_2"),
        "exac_constraint": pipeline.get_task("prepare_exac_constraint"),
        "exac_regional_missense_constraint": pipeline.get_task("prepare_exac_regional_missense_constraint"),
        "gnomad_constraint": pipeline.get_task("prepare_gnomad_v2_constraint"),
    },
    {"join_on": "canonical_transcript_id"},
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

###############################################
# Extract transcripts
###############################################

pipeline.add_task(
    "extract_grch37_transcripts",
    extract_transcripts,
    "/genes/transcripts_grch37_base.ht",
    {"genes_path": pipeline.get_task("annotate_grch37_genes_step_3")},
)

pipeline.add_task(
    "extract_grch38_transcripts",
    extract_transcripts,
    "/genes/transcripts_grch38_base.ht",
    {"genes_path": pipeline.get_task("annotate_grch38_genes_step_2")},
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


if __name__ == "__main__":
    run_pipeline(pipeline)

import json

import hail as hl

from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.annotate_table import annotate_table

from data_pipeline.gene_models.gene_models import prepare_gene_models
from data_pipeline.gene_models.canonical_transcripts import get_canonical_transcripts
from data_pipeline.gene_models.mane_select_transcripts import import_mane_select_transcripts
from data_pipeline.gene_models.transcripts import (
    annotate_gene_transcripts_with_tissue_expression,
    annotate_gene_transcripts_with_refseq_id,
    extract_transcripts,
)

from data_pipeline.expression.gtex_tissue_expression import prepare_gtex_expression_data
from data_pipeline.expression.pext import prepare_pext_data

from data_pipeline.constraint.exac_constraint import prepare_exac_constraint
from data_pipeline.constraint.exac_regional_missense_constraint import prepare_exac_regional_missense_constraint
from data_pipeline.constraint.gnomad_v2_constraint import prepare_gnomad_v2_constraint


staging_path = config.staging_path.rstrip("/")

gene_models_pipeline = Pipeline()

###############################################
# Basic gene models
###############################################

gene_models_pipeline.add_download_task(
    "download_gencode_v19_gtf",
    "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz",
    staging_path + "/external_sources/gencode.v19.gtf.gz",
)

gene_models_pipeline.add_download_task(
    "download_gencode_v29_gtf",
    "ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_29/gencode.v29.annotation.gtf.gz",
    staging_path + "/external_sources/gencode.v29.gtf.gz",
)

gene_models_pipeline.add_download_task(
    "download_hgnc_names",
    "https://www.genenames.org/cgi-bin/download/custom?col=gd_hgnc_id&col=gd_app_sym&col=gd_app_name&col=gd_prev_sym&col=gd_aliases&col=gd_pub_ensembl_id&col=md_ensembl_id&col=md_mim_id&status=Approved&hgnc_dbtag=on&order_by=gd_app_sym_sort&format=text&submit=submit",
    staging_path + "/external_sources/hgnc.tsv",
)

gene_models_pipeline.add_task(
    "prepare_grch37_gene_models",
    prepare_gene_models,
    staging_path + "/gene_models/gene_models_grch37.ht",
    {
        "gencode_path": gene_models_pipeline.get_task("download_gencode_v19_gtf").output_path,
        "hgnc_path": gene_models_pipeline.get_task("download_hgnc_names").output_path,
    },
    {"reference_genome": "GRCh37"},
)

gene_models_pipeline.add_task(
    "prepare_grch38_gene_models",
    prepare_gene_models,
    staging_path + "/gene_models/gene_models_grch38.ht",
    {
        "gencode_path": gene_models_pipeline.get_task("download_gencode_v29_gtf").output_path,
        "hgnc_path": gene_models_pipeline.get_task("download_hgnc_names").output_path,
    },
    {"reference_genome": "GRCh38"},
)

###############################################
# MANE Select transcripts
###############################################

gene_models_pipeline.add_download_task(
    "download_mane_select_transcripts",
    "https://ftp.ncbi.nlm.nih.gov/refseq/MANE/MANE_human/release_0.8/MANE.GRCh38.v0.8.summary.txt.gz",
    staging_path + "/external_sources/MANE.GRCh38.v0.8.summary.txt.gz",
)

gene_models_pipeline.add_task(
    "import_mane_select_transcripts",
    import_mane_select_transcripts,
    staging_path + "/gene_models/mane_select_transcripts.ht",
    {"path": gene_models_pipeline.get_task("download_mane_select_transcripts").output_path},
)

###############################################
# Canonical transcripts
###############################################

gene_models_pipeline.add_task(
    "get_grch37_canonical_transcripts",
    get_canonical_transcripts,
    staging_path + "/gene_models/canonical_transcripts_grch37.ht",
    {
        "exomes": "gs://gnomad-public-requester-pays/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "genomes": "gs://gnomad-public-requester-pays/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

gene_models_pipeline.add_task(
    "get_grch38_canonical_transcripts",
    get_canonical_transcripts,
    staging_path + "/gene_models/canonical_transcripts_grch38.ht",
    {"genomes": "gs://gnomad-public-requester-pays/release/3.0/ht/genomes/gnomad.genomes.r3.0.sites.ht",},
)

###############################################
# Tissue expression
###############################################

gene_models_pipeline.add_task(
    "prepare_gtex_v7_expression_data",
    prepare_gtex_expression_data,
    staging_path + "/gtex/gtex_v7_tissue_expression.ht",
    {
        "transcript_tpms_path": "gs://gtex_analysis_v7/rna_seq_data/GTEx_Analysis_2016-01-15_v7_RSEMv1.2.22_transcript_tpm.txt.gz",
        "sample_annotations_path": "gs://gtex_analysis_v7/annotations/GTEx_v7_Annotations_SampleAttributesDS.txt",
        "tmp_path": staging_path + "/external_sources",
    },
)

gene_models_pipeline.add_task(
    "prepare_pext",
    prepare_pext_data,
    staging_path + "/pext_grch37.ht",
    {
        "base_level_pext_path": "gs://gnomad-public/papers/2019-tx-annotation/gnomad_browser/all.baselevel.021620.ht",
        "low_max_pext_genes_path": "gs://gnomad-public/papers/2019-tx-annotation/data/GRCH37_hg19/max_pext_low_genes.021520.tsv",
    },
)

###############################################
# Constraint
###############################################

gene_models_pipeline.add_task(
    "prepare_exac_constraint",
    prepare_exac_constraint,
    staging_path + "/constraint/exac_constraint.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/forweb_cleaned_exac_r03_march16_z_data_pLI_CNV-final.txt.gz"},
)

gene_models_pipeline.add_task(
    "prepare_exac_regional_missense_constraint",
    prepare_exac_regional_missense_constraint,
    staging_path + "/constraint/exac_regional_missense_constraint.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/regional_missense_constraint.tsv"},
)

gene_models_pipeline.add_task(
    "prepare_gnomad_v2_constraint",
    prepare_gnomad_v2_constraint,
    staging_path + "/constraint/gnomad_v2_constraint.ht",
    {"path": "gs://gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.ht"},
)

###############################################
# Annotate genes
###############################################

gene_models_pipeline.add_task(
    "annotate_grch37_gene_models_step_1",
    annotate_table,
    staging_path + "/gene_models/gene_models_grch37_annotated_1.ht",
    {
        "table_path": gene_models_pipeline.get_task("prepare_grch37_gene_models").output_path,
        "canonical_transcript": gene_models_pipeline.get_task("get_grch37_canonical_transcripts").output_path,
        "pext": gene_models_pipeline.get_task("prepare_pext").output_path,
    },
)

gene_models_pipeline.add_task(
    "annotate_grch37_gene_models_step_2",
    annotate_gene_transcripts_with_tissue_expression,
    staging_path + "/gene_models/gene_models_grch37_annotated_2.ht",
    {
        "table_path": gene_models_pipeline.get_task("annotate_grch37_gene_models_step_1").output_path,
        "gtex_tissue_expression_path": gene_models_pipeline.get_task("prepare_gtex_v7_expression_data").output_path,
    },
)

gene_models_pipeline.add_task(
    "annotate_grch37_gene_models_step_3",
    annotate_table,
    staging_path + "/gene_models/gene_models_grch37_annotated_3.ht",
    {
        "table_path": gene_models_pipeline.get_task("annotate_grch37_gene_models_step_2").output_path,
        "exac_constraint": gene_models_pipeline.get_task("prepare_exac_constraint").output_path,
        "exac_regional_missense_constraint": gene_models_pipeline.get_task(
            "prepare_exac_regional_missense_constraint"
        ).output_path,
        "gnomad_constraint": gene_models_pipeline.get_task("prepare_gnomad_v2_constraint").output_path,
    },
    {"join_on": "canonical_transcript_id"},
)

gene_models_pipeline.add_task(
    "annotate_grch38_gene_models_step_1",
    annotate_table,
    staging_path + "/gene_models/gene_models_grch38_annotated_1.ht",
    {
        "table_path": gene_models_pipeline.get_task("prepare_grch38_gene_models").output_path,
        "canonical_transcript": gene_models_pipeline.get_task("get_grch38_canonical_transcripts").output_path,
        "mane_select_transcript": gene_models_pipeline.get_task("import_mane_select_transcripts").output_path,
    },
)

gene_models_pipeline.add_task(
    "annotate_grch38_gene_models_step_2",
    annotate_gene_transcripts_with_refseq_id,
    staging_path + "/gene_models/gene_models_grch38_annotated_2.ht",
    {
        "table_path": gene_models_pipeline.get_task("annotate_grch38_gene_models_step_1").output_path,
        "mane_select_transcripts_path": gene_models_pipeline.get_task("import_mane_select_transcripts").output_path,
    },
)

###############################################
# Extract transcripts
###############################################

gene_models_pipeline.add_task(
    "extract_grch37_transcripts",
    extract_transcripts,
    staging_path + "/gene_models/transcript_models_grch37.ht",
    {"gene_models_path": gene_models_pipeline.get_task("annotate_grch37_gene_models_step_3").output_path},
)

gene_models_pipeline.add_task(
    "extract_grch38_transcripts",
    extract_transcripts,
    staging_path + "/gene_models/transcript_models_grch38.ht",
    {"gene_models_path": gene_models_pipeline.get_task("annotate_grch38_gene_models_step_2").output_path},
)

###############################################
# Annotate transcripts
###############################################

gene_models_pipeline.add_task(
    "annotate_grch37_transcripts",
    annotate_table,
    staging_path + "/gene_models/transcript_models_grch37_annotated_1.ht",
    {
        "table_path": gene_models_pipeline.get_task("extract_grch37_transcripts").output_path,
        "exac_constraint": gene_models_pipeline.get_task("prepare_exac_constraint").output_path,
        "gnomad_constraint": gene_models_pipeline.get_task("prepare_gnomad_v2_constraint").output_path,
    },
)


###############################################
# Collect search terms
###############################################


class Writer:
    def __init__(self, content):
        self.content = content

    def write(self, path, overwrite):  # pylint: disable=unused-argument
        open_fn = hl.hadoop_open if path.startswith("gs://") else open
        with open_fn(path, "w") as output_file:
            output_file.write(self.content)


def collect_search_terms(**gene_models_paths):
    search_terms = {}

    for path in gene_models_paths.values():
        genes = hl.read_table(path).select("search_terms").collect()
        for gene in genes:
            search_terms[gene.gene_id] = search_terms.get(gene.gene_id, set()).union(gene.search_terms)

    # Convert sets to lists for JSON serialization.
    search_terms = {key: list(value) for key, value in search_terms.items()}

    return Writer(json.dumps(search_terms))


gene_models_pipeline.add_task(
    "collect_search_terms",
    collect_search_terms,
    staging_path + "/gene_models/search_terms.json",
    {
        "grch37": gene_models_pipeline.get_task("prepare_grch37_gene_models").output_path,
        "grch38": gene_models_pipeline.get_task("prepare_grch38_gene_models").output_path,
    },
)


if __name__ == "__main__":
    args = parse_pipeline_args(gene_models_pipeline)

    hl.init()

    gene_models_pipeline.run(**args)

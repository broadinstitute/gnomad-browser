#!/usr/bin/env python

import argparse
import hail
from pprint import pprint
from utils.computed_fields_utils import get_expr_for_xpos, get_expr_for_orig_alt_alleles_set, \
    get_expr_for_variant_id, get_expr_for_vep_gene_ids_set, get_expr_for_vep_transcript_ids_set, \
    get_expr_for_vep_consequence_terms_set, get_expr_for_vep_sorted_transcript_consequences_array, \
    get_expr_for_worst_transcript_consequence_annotations_struct, get_expr_for_end_pos, \
    get_expr_for_contig, get_expr_for_start_pos, get_expr_for_alt_allele, get_expr_for_ref_allele
from utils.elasticsearch_utils import export_kt_to_elasticsearch
from utils.vds_schema_string_utils import convert_vds_schema_string_to_vds_make_table_arg

p = argparse.ArgumentParser()
p.add_argument("-g", "--genome_version", help="Genome build: 37 or 38", choices=["37", "38"], required=True)
p.add_argument("-H", "--host", help="Elasticsearch node host or IP. To look this up, run: `kubectl describe nodes | grep Addresses`", required=True)
p.add_argument("-p", "--port", help="Elasticsearch port", default=30001, type=int)  # 9200
p.add_argument("-i", "--index", help="Elasticsearch index name", default="schizophrenia")
p.add_argument("-t", "--index-type", help="Elasticsearch index type", default="variant")
p.add_argument("-v", "--schizophrenia-vds", help="Path to schizophrenia data", required=True)
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=200, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

# parse args
args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

vds = hc.read(args.schizophrenia_vds)

# based on output of pprint(vds.variant_schema)
SCHIZOPHRENIA_SCHEMA = {
    "top_level_fields": """
        chrom: String,
        pos: Int,
        xpos: Int,
        ref: String,
        alt: String,
        rsid: String,
        qual: Double,
        filters: Set[String],

        variantId: String,
        originalAltAlleles: Set[String],
        geneIds: Set[String],
        transcriptIds: Set[String],
        transcriptConsequenceTerms: Set[String],
        mainTranscript: Struct,
        sortedTranscriptConsequences: String,
    """,

    "info_fields": """
         AC: Array[Int],
         AF: Array[Double],
         AN: Int,
         BaseQRankSum: Double,
         CCC: Int,
         ClippingRankSum: Double,
         DP: Int,
         DS: Boolean,
         END: Int,
         FS: Double,
         GQ_MEAN: Double,
         GQ_STDDEV: Double,
         HWP: Double,
         HaplotypeScore: Double,
         InbreedingCoeff: Double,
         MLEAC: Array[Int],
         MLEAF: Array[Double],
         MQ: Double,
         MQ0: Int,
         MQRankSum: Double,
         NCC: Int,
         NEGATIVE_TRAIN_SITE: Boolean,
         POSITIVE_TRAIN_SITE: Boolean,
         QD: Double,
         ReadPosRankSum: Double,
         SOR: Double,
         VQSLOD: Double,
         culprit: String,
         AC_Hom: Array[Int],
         AC_Het: Array[Int],
         AC_Hemi: Array[Int],
    """
}

vds_computed_annotations_exprs = [
    "va.chrom = %s" % get_expr_for_contig(),
    "va.pos = %s" % get_expr_for_start_pos(),
    "va.ref = %s" % get_expr_for_ref_allele(),
    "va.alt = %s" % get_expr_for_alt_allele(),
    "va.xpos = %s" % get_expr_for_xpos(),

    "va.variantId = %s" % get_expr_for_variant_id(),
    "va.originalAltAlleles = %s" % get_expr_for_orig_alt_alleles_set(),
    "va.geneIds = %s" % get_expr_for_vep_gene_ids_set(),
    "va.transcriptIds = %s" % get_expr_for_vep_transcript_ids_set(),
    "va.transcriptConsequenceTerms = %s" % get_expr_for_vep_consequence_terms_set(),
    "va.sortedTranscriptConsequences = %s" % get_expr_for_vep_sorted_transcript_consequences_array(),
    "va.mainTranscript = %s" % get_expr_for_worst_transcript_consequence_annotations_struct("va.sortedTranscriptConsequences"),
    "va.sortedTranscriptConsequences = json(va.sortedTranscriptConsequences)"
]

print("======== Exomes: KT Schema ========")
for expr in vds_computed_annotations_exprs:
    vds = vds.annotate_variants_expr(expr)
kt_variant_expr = convert_vds_schema_string_to_vds_make_table_arg(split_multi=False, **SCHIZOPHRENIA_SCHEMA)
kt = vds.make_table(kt_variant_expr, [])

pprint(kt.schema)

# flatten and prune mainTranscript
transcript_annotations_to_keep = [
    "amino_acids",
    "biotype",
    "canonical",
    "cdna_start",
    "cdna_end",
    "codons",
    #"distance",
    "domains",
    "exon",
    "gene_id",
    "gene_symbol",
    "gene_symbol_source",
    "hgnc_id",
    "hgvsc",
    "hgvsp",
    "lof",
    "lof_flags",
    "lof_filter",
    "lof_info",
    "protein_id",
    "transcript_id",

    "hgvs",
    "major_consequence",
    "major_consequence_rank",
    "category",
]

pprint(kt.schema)

for field_name in transcript_annotations_to_keep:
    new_field_name = field_name.split("_")[0] + "".join(map(lambda word: word.capitalize(), field_name.split("_")[1:]))
    kt = kt.annotate("%(new_field_name)s = mainTranscript.%(field_name)s" % locals())

# pprint(kt.schema)

kt = kt.drop(["mainTranscript"])

pprint(kt.schema)

DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS = ("sortedTranscriptConsequences", )

print("======== Export to elasticsearch ======")
export_kt_to_elasticsearch(
    kt,
    host=args.host,
    port=args.port,
    index_name=args.index,
    index_type_name=args.index_type,
    block_size=args.block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    disable_doc_values_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    disable_index_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    verbose=True,
)

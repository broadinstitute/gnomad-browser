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
p.add_argument("-v", "--clinvar-vds", help="Path to clinvar data", required=True)
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=200, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

# parse args
args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

vds = hc.read(args.clinvar_vds)

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

    """,

    "info_fields": """
        MEASURESET_TYPE: String,
         MEASURESET_ID: String,
         RCV: String,
         ALLELE_ID: String,
         SYMBOL: String,
         HGVS_C: String,
         HGVS_P: String,
         MOLECULAR_CONSEQUENCE: String,
         CLINICAL_SIGNIFICANCE: String,
         PATHOGENIC: String,
         BENIGN: String,
         CONFLICTED: String,
         REVIEW_STATUS: String,
         GOLD_STARS: String,
         ALL_SUBMITTERS: String,
         ALL_TRAITS: String,
         ALL_PMIDS: String,
         INHERITANCE_MODES: String,
         AGE_OF_ONSET: String,
         PREVALENCE: String,
         DISEASE_MECHANISM: String,
         ORIGIN: String,
         XREFS: String
    """
}

vds_computed_annotations_exprs = [
    "va.chrom = %s" % get_expr_for_contig(),
    "va.pos = %s" % get_expr_for_start_pos(),
    "va.ref = %s" % get_expr_for_ref_allele(),
    "va.alt = %s" % get_expr_for_alt_allele(),
    "va.xpos = %s" % get_expr_for_xpos(),
]

print("======== Exomes: KT Schema ========")
for expr in vds_computed_annotations_exprs:
    vds = vds.annotate_variants_expr(expr)
kt_variant_expr = convert_vds_schema_string_to_vds_make_table_arg(split_multi=False, **SCHIZOPHRENIA_SCHEMA)
kt = vds.make_table(kt_variant_expr, [])

pprint(kt.schema)

# DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS = ("sortedTranscriptConsequences", )

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
    # disable_doc_values_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    # disable_index_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    verbose=True,
)

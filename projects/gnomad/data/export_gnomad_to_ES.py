#!/usr/bin/env python

import argparse
import hail
from pprint import pprint
from utils.computed_fields_utils import get_expr_for_xpos, get_expr_for_orig_alt_alleles_set, \
    get_expr_for_variant_id, get_expr_for_vep_gene_ids_set, get_expr_for_vep_transcript_ids_set, \
    get_expr_for_vep_consequence_terms_set, get_expr_for_vep_sorted_transcript_consequences_array, \
    get_expr_for_worst_transcript_consequence_annotations_struct, get_expr_for_end_pos, \
    get_expr_for_contig, get_expr_for_start_pos, get_expr_for_alt_allele, get_expr_for_ref_allele
from utils.elasticsearch_client import ElasticsearchClient
from utils.vds_schema_string_utils import convert_vds_schema_string_to_vds_make_table_arg
from utils.add_cadd import add_cadd_to_vds
from utils.add_clinvar import add_clinvar_to_vds
from utils.add_mpc import add_mpc_to_vds

p = argparse.ArgumentParser()
p.add_argument("-g", "--genome_version", help="Genome build: 37 or 38", choices=["37", "38"], required=True)
p.add_argument("-H", "--host", help="Elasticsearch node host or IP. To look this up, run: `kubectl describe nodes | grep Addresses`", required=True)
p.add_argument("-p", "--port", help="Elasticsearch port", default=30001, type=int)  # 9200
p.add_argument("-E", "--vds", help="Dataset to be loaded", required=True)
p.add_argument("-i", "--index", help="Elasticsearch index name", default="variants")
p.add_argument("-t", "--index-type", help="Elasticsearch index type", default="variant")
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=200, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

vds = hc.read(args.vds)

# based on output of pprint(vds.variant_schema)
GNOMAD_SCHEMA = {
    "top_level_fields": """
        contig: String,
        start: Int,
        ref: String,
        alt: String,

        rsid: String,
        qual: Double,
        filters: Set[String],
        wasSplit: Boolean,

        variantId: String,
        originalAltAlleles: Set[String],
        geneIds: Set[String],
        transcriptIds: Set[String],
        transcriptConsequenceTerms: Set[String],
        mainTranscript: Struct,
        sortedTranscriptConsequences: String,
    """,

    "info_fields": """
        AC: Int,
        AF: Double,
        AN: Int,
        BaseQRankSum: Double,
        ClippingRankSum: Double,
        DP: Int,
        FS: Double,
        InbreedingCoeff: Double,
        MQ: Double,
        MQRankSum: Double,
        QD: Double,
        ReadPosRankSum: Double,
        VQSLOD: Double,
        VQSR_culprit: String,
        AS_RF: Double,
        DREF_MEDIAN: Double,
        DP_MEDIAN: Int,
        GQ_MEDIAN: Int,
        AB_MEDIAN: Double,
        GQ_HIST_ALT: String,
        DP_HIST_ALT: String,
        AB_HIST_ALT: String,
        GQ_HIST_ALL: String,
        DP_HIST_ALL: String,
        AB_HIST_ALL: String,
        AC_AFR: Int,
        AC_AMR: Int,
        AC_ASJ: Int,
        AC_EAS: Int,
        AC_FIN: Int,
        AC_NFE: Int,
        AC_OTH: Int,
        AC_Male: Int,
        AC_Female: Int,
        AN_AFR: Int,
        AN_AMR: Int,
        AN_ASJ: Int,
        AN_EAS: Int,
        AN_FIN: Int,
        AN_NFE: Int,
        AN_OTH: Int,
        AN_Male: Int,
        AN_Female: Int,
        AF_AFR: Double,
        AF_AMR: Double,
        AF_ASJ: Double,
        AF_EAS: Double,
        AF_FIN: Double,
        AF_NFE: Double,
        AF_OTH: Double,
        AF_Male: Double,
        AF_Female: Double,
        Hom_AFR: Int,
        Hom_AMR: Int,
        Hom_ASJ: Int,
        Hom_EAS: Int,
        Hom_FIN: Int,
        Hom_NFE: Int,
        Hom_OTH: Int,
        Hom_Male: Int,
        Hom_Female: Int,
        Hom: Int,
        POPMAX: String,
        AC_POPMAX: Int,
        AN_POPMAX: Int,
        AF_POPMAX: Double,
        Hemi_NFE: Int,
        Hemi_AFR: Int,
        Hemi_AMR: Int,
        Hemi: Int,
        Hemi_ASJ: Int,
        Hemi_OTH: Int,
        Hemi_FIN: Int,
        Hemi_EAS: Int,
        segdup: Boolean,
        lcr: Boolean,
        MPC: Double,
        fitted_score: Double,
        mis_badness: Double,
        obs_exp: Double,
    """

}

if args.index == 'gnomad_exomes':
    GNOMAD_SCHEMA["info_fields"] += """
        AC_SAS: Int,
        AN_SAS: Int,
        AF_SAS: Double,
        Hom_SAS: Int,
        Hemi_SAS: Int,
    """

vds_computed_annotations_exprs = [
    "va.contig = %s" % get_expr_for_contig(),
    "va.start = %s" % get_expr_for_start_pos(),
    "va.ref = %s" % get_expr_for_ref_allele(),
    "va.alt = %s" % get_expr_for_alt_allele(),
    "va.variantId = %s" % get_expr_for_variant_id(),
    "va.originalAltAlleles = %s" % get_expr_for_orig_alt_alleles_set(),
    "va.geneIds = %s" % get_expr_for_vep_gene_ids_set(),
    "va.transcriptIds = %s" % get_expr_for_vep_transcript_ids_set(),
    "va.transcriptConsequenceTerms = %s" % get_expr_for_vep_consequence_terms_set(),
    "va.sortedTranscriptConsequences = %s" % get_expr_for_vep_sorted_transcript_consequences_array(),
    "va.mainTranscript = %s" % get_expr_for_worst_transcript_consequence_annotations_struct("va.sortedTranscriptConsequences"),
    "va.sortedTranscriptConsequences = json(va.sortedTranscriptConsequences)",
]

# vep_root = 'va'

# for vep_sub_field in ['transcript_consequences', 'intergenic_consequences', 'motif_feature_consequences', 'regulatory_feature_consequences']:
#     vds_computed_annotations_exprs.append('%(vep_root)s.%(vep_sub_field)s = %(vep_root)s.%(vep_sub_field)s.filter(x => x.allele_num == va.aIndex)' % locals())

CLINVAR_INFO_FIELDS = """
    --- variation_type: String,
    variation_id: String,
    --- rcv: String,
    --- scv: String,
    allele_id: Int,
    clinical_significance: String,
    pathogenic: Int,
    likely_pathogenic: Int,
    uncertain_significance: Int,
    likely_benign: Int,
    benign: Int,
    conflicted: Int,
    --- gold_stars: String,
    review_status: String,
    all_submitters: String,
    --- all_traits: String,
    --- all_pmids: String,
    inheritance_modes: String,
    --- age_of_onset: String,
    --- prevalence: String,
    --- disease_mechanism: String,
    --- origin: String,
    --- xrefs: String,
"""

CADD_INFO_FIELDS = """
    PHRED: Double,
    RawScore: Double,
"""

MPC_INFO_FIELDS = """
    MPC: String,
    fitted_score: Double,
    mis_badness: Double,
    obs_exp: Double,
"""

vds = vds.annotate_variants_expr("va.originalAltAlleles=%s" % get_expr_for_orig_alt_alleles_set())
vds = add_mpc_to_vds(hc, vds, args.genome_version, root="va.info", info_fields=MPC_INFO_FIELDS)

pprint(vds.variant_schema)
for expr in vds_computed_annotations_exprs:
    vds = vds.annotate_variants_expr(expr)
kt_variant_expr = convert_vds_schema_string_to_vds_make_table_arg(**GNOMAD_SCHEMA)
# print kt_variant_expr
kt = vds.make_table(kt_variant_expr, [])
# pprint(kt.schema)

kt = kt.annotate("pos = start")
kt = kt.annotate("stop = %s" % get_expr_for_end_pos(field_prefix="", pos_field="start", ref_field="ref"))
kt = kt.annotate("xpos = %s" % get_expr_for_xpos(field_prefix="", pos_field="start"))
kt = kt.annotate("xstart = %s" % get_expr_for_xpos(field_prefix="", pos_field="start"))
kt = kt.annotate("xstop = %s" % get_expr_for_xpos(field_prefix="", pos_field="stop"))

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

for field_name in transcript_annotations_to_keep:
    new_field_name = field_name.split("_")[0] + "".join(map(lambda word: word.capitalize(), field_name.split("_")[1:]))
    kt = kt.annotate("%(new_field_name)s = mainTranscript.%(field_name)s" % locals())

kt = kt.drop(["mainTranscript"])

# pprint(kt.schema)

DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS = ("sortedTranscriptConsequences", )

print("======== Export to elasticsearch ======")
es = ElasticsearchClient(
    host=args.host,
    port=args.port,
)

es.export_kt_to_elasticsearch(
    kt,
    index_name=args.index,
    index_type_name=args.index_type,
    block_size=args.block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    disable_doc_values_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    disable_index_for_fields=DISABLE_INDEX_AND_DOC_VALUES_FOR_FIELDS,
    verbose=True,
)

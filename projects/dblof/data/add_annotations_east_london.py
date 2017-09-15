#!/usr/bin/env python

import argparse
import hail
from pprint import pprint

from utils.computed_fields_utils import get_expr_for_variant_id, \
    get_expr_for_vep_gene_ids_set, get_expr_for_vep_transcript_ids_set, \
    get_expr_for_orig_alt_alleles_set, get_expr_for_vep_consequence_terms_set, \
    get_expr_for_vep_sorted_transcript_consequences_array, \
    get_expr_for_worst_transcript_consequence_annotations_struct, get_expr_for_end_pos, \
    get_expr_for_xpos, get_expr_for_contig, get_expr_for_start_pos, get_expr_for_alt_allele, \
    get_expr_for_ref_allele
from utils.vds_schema_string_utils import convert_vds_schema_string_to_annotate_variants_expr
from utils.add_1kg_phase3 import add_1kg_phase3_from_vds
from utils.add_cadd import add_cadd_from_vds
from utils.add_clinvar import add_clinvar_from_vds
from utils.add_exac import add_exac_from_vds
from utils.add_gnomad import add_gnomad_from_vds
from utils.add_mpc import add_mpc_from_vds

p = argparse.ArgumentParser()
p.add_argument("-g", "--genome-version", help="Genome build: 37 or 38", choices=["37", "38"], required=True)
p.add_argument("input_vds", help="input VDS")

# parse args
args = p.parse_args()

input_vds_path = str(args.input_vds)
if not input_vds_path.endswith(".vds"):
    p.error("Input must be a .vds")

input_vds_path_prefix = input_vds_path.replace(".vds", "")
output_vds_path = input_vds_path_prefix + ".clinvar.cadd.mpc.vds"

print("Input: " + input_vds_path)
print("Output: " + output_vds_path)

print("\n==> create HailContext")
hc = hail.HailContext(log="/hail.log")

print("\n==> import vds: " + input_vds_path)
vds = hc.read(input_vds_path)

print("\n==> adding other annotations")

vds_computed_annotation_exprs = [
    "va.geneIds = %s" % get_expr_for_vep_gene_ids_set(vep_root="va.vep"),
    "va.transcriptIds = %s" % get_expr_for_vep_transcript_ids_set(vep_root="va.vep"),
    "va.transcriptConsequenceTerms = %s" % get_expr_for_vep_consequence_terms_set(vep_root="va.vep"),
    "va.sortedTranscriptConsequences = %s" % get_expr_for_vep_sorted_transcript_consequences_array(vep_root="va.vep"),
    "va.mainTranscript = %s" % get_expr_for_worst_transcript_consequence_annotations_struct("va.sortedTranscriptConsequences"),
    "va.sortedTranscriptConsequences = json(va.sortedTranscriptConsequences)",

    "va.variantId = %s" % get_expr_for_variant_id(),

    "va.contig = %s" % get_expr_for_contig(),
    "va.start = %s" % get_expr_for_start_pos(),
    "va.pos = %s" % get_expr_for_start_pos(),
    "va.end = %s" % get_expr_for_end_pos(),
    "va.ref = %s" % get_expr_for_ref_allele(),
    "va.alt = %s" % get_expr_for_alt_allele(),

    "va.xpos = %s" % get_expr_for_xpos(pos_field="start"),
    "va.xstart = %s" % get_expr_for_xpos(pos_field="start"),
    "va.xstop = %s" % get_expr_for_xpos(field_prefix="va.", pos_field="end"),
]

for expr in vds_computed_annotation_exprs:
    vds = vds.annotate_variants_expr(expr)


# apply schema to dataset
INPUT_SCHEMA = {
    "top_level_fields": """
        contig: String,
        start: Int,
        pos: Int,
        end: Int,
        ref: String,
        alt: String,
        xpos: Long,
        xstart: Long,
        xstop: Long,
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

expr = convert_vds_schema_string_to_annotate_variants_expr(root="va.clean", **INPUT_SCHEMA)
print(expr)
vds = vds.annotate_variants_expr(expr=expr)
vds = vds.annotate_variants_expr("va = va.clean")

# add reference data
CLINVAR_INFO_FIELDS = """
    MEASURESET_TYPE: String,
    MEASURESET_ID: String,
    RCV: String,
    ALLELE_ID: String,
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

CADD_INFO_FIELDS = """
    PHRED: Double,
    RawScore: Double,
"""

MPC_INFO_FIELDS = """
    MPC: Double,
    fitted_score: Double,
    mis_badness: Double,
    obs_exp: Double,
"""

print("\n==> add clinvar")
vds = add_clinvar_from_vds(hc, vds, args.genome_version, root="va.clinvar", info_fields=CLINVAR_INFO_FIELDS)
print("\n==> add cadd")
vds = add_cadd_from_vds(hc, vds, args.genome_version, root="va.cadd", info_fields=CADD_INFO_FIELDS)
print("\n==> add mpc")
vds = add_mpc_from_vds(hc, vds, args.genome_version, root="va.mpc", info_fields=MPC_INFO_FIELDS)
print("\n==> saving to " + output_vds_path)
vds.write(output_vds_path, overwrite=True)

#vds.export_variants("gs://seqr-hail/temp/" + os.path.basename(output_vds_path).replace(".vds", "") + ".tsv", "variant = v, va.*")

# see https://hail.is/hail/annotationdb.html#query-builder
#vds = vds.annotate_variants_db([
#    'va.cadd.PHRED',
#    'va.cadd.RawScore',
#    'va.dann.score',
#])

#pprint(vds.summarize())
pprint(vds.variant_schema)

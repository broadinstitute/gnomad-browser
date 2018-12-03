# Usage:
#
# cd /path/to/hail-elasticsearch-pipelines
# rm hail_scripts.zip
# zip -r hail_scripts.zip hail_scripts
# cd /path/to/gnomadjs/projects/gnomad/data
# cluster start $CLUSTER_NAME
# gcloud dataproc jobs submit pyspark \
#   --cluster=$CLUSTER_NAME \
#   --py-files=/path/to/hail-elasticsearch-pipelines/hail_scripts.zip \
#   ./prepare_mnvs.py -- --input-url=$INPUT_URL --output-url=$OUTPUT_URL
# cluster stop $CLUSTER_NAME
#

import argparse

import hail as hl

from hail_scripts.v02.utils.computed_fields import get_expr_for_xpos

p = argparse.ArgumentParser()
p.add_argument("--input-url", help="URL of MNV Hail table", required=True)
p.add_argument("--output-url", help="URL to write output Hail table to", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

###########
# Prepare #
###########

# Codons are stored as codon1/codon2
def index_of_change(codons_str):
    return hl.bind(lambda codons: hl.range(0, 3).find(lambda i: codons[0][i] != codons[1][i]), codons_str.split("/"))


def swap_codons(codons_str):
    return hl.bind(lambda codons: codons[1] + "/" + codons[0], codons_str.split("/"))


# Convert the string "None" to null
def none_to_null(value):
    return hl.cond(value == "None", hl.null(hl.tstr), value)


# The row's locus field contains the position of the first ref/alt base.
# However, we don't know whether that first base is snp1 or snp2.
# (snp1 is the upstream SNP)
#
# Both SNPs may have the same ref and alt, so we can't tell whether snp1 comes first
# by matching the first ref/alt to the changed base in snp1_codons.
# We also can't tell if snp1 comes first by looking only at the index of the changed
# base in snp1's codons, since the second base in the codon could contain either the
# first or second change.
#
# We can map the row's locus to an index in the codons by finding the index of the
# first changed base in the MNV's codons.
# Combining that with the index of the change in the snp1/snp2 codons, we can
# determine the position of snp1 and snp2 relative to the locus.
def snp_variant_id(snp_number):
    snp_codons = ds[f"snp{snp_number}_codons"]
    return hl.bind(
        lambda snp_offset_from_position: hl.bind(
            lambda contig, position, ref, alt: contig + "-" + hl.str(position) + "-" + ref + "-" + alt,
            ds.locus.contig,
            ds.locus.position + snp_offset_from_position,
            ds.refs[snp_offset_from_position],
            ds.alts[snp_offset_from_position],
        ),
        index_of_change(snp_codons) - index_of_change(ds.mnv_codons),
    )


def snp_ref(snp_number):
    snp_codons = ds[f"snp{snp_number}_codons"]
    return ds.refs[index_of_change(snp_codons) - index_of_change(ds.mnv_codons)]


ds = ds.annotate(
    chrom=ds.locus.contig,
    pos=ds.locus.position,
    xpos=get_expr_for_xpos(ds),
    snp1_variant_id=snp_variant_id(1),
    snp2_variant_id=snp_variant_id(2),
    snp1_lof=none_to_null(ds.snp1_lof),
    snp2_lof=none_to_null(ds.snp2_lof),
    mnv_lof=none_to_null(ds.mnv_lof),
    # In the Hail table, the order of the codons is based on the order of transcription.
    # For the browser, order them ref codon first then alt codon.
    snp1_codons=hl.cond(
        ds.snp1_codons[index_of_change(ds.snp1_codons)] != snp_ref(1), swap_codons(ds.snp1_codons), ds.snp1_codons
    ),
    snp2_codons=hl.cond(
        ds.snp2_codons[index_of_change(ds.snp2_codons)] != snp_ref(2), swap_codons(ds.snp2_codons), ds.snp2_codons
    ),
    mnv_codons=hl.bind(
        lambda offset: hl.cond(
            ds.mnv_codons[offset : offset + ds.refs.length()] != ds.refs, swap_codons(ds.mnv_codons), ds.mnv_codons
        ),
        index_of_change(ds.mnv_codons),
    ),
)

ds = ds.transmute(category=ds.categ)

ds = ds.order_by("xpos").drop("locus")

#########
# Write #
#########

ds.write(args.output_url)

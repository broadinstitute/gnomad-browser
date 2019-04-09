import argparse
import csv
import tempfile

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    CONSEQUENCE_TERM_RANK_LOOKUP,
    get_expr_for_contig,
    get_expr_for_xpos,
)

p = argparse.ArgumentParser()
p.add_argument("--input-url", help="URL of MNV TSV file", required=True)
p.add_argument("--output-url", help="URL to write output Hail table to", required=True)
args = p.parse_args()

# Change field quote character from double quotes to single quotes.
# Work around for hail-is/hail#5796 to import filter columns as arrays.
# Requires that args.input_url point to a local file.
with open(args.input_url, "r") as fin:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".tsv", dir=".", delete=False
    ) as fout:
        temp_csv = fout.name
        reader = csv.reader(fin, delimiter="\t")
        writer = csv.writer(fout, delimiter="\t", quotechar="'")
        for row in reader:
            writer.writerow(row)


hl.init(log="/tmp/hail.log")

column_types = {
    "AC_mnv_ex": hl.tint,
    "AC_mnv_gen": hl.tint,
    "AC_mnv": hl.tint,
    "AC_snp1_ex": hl.tint,
    "AC_snp1_gen": hl.tint,
    "AC_snp1": hl.tint,
    "AC_snp2_ex": hl.tint,
    "AC_snp2_gen": hl.tint,
    "AC_snp2": hl.tint,
    "AN_snp1_ex": hl.tfloat,
    "AN_snp1_gen": hl.tfloat,
    "AN_snp2_ex": hl.tfloat,
    "AN_snp2_gen": hl.tfloat,
    "categ": hl.tstr,
    "filter_snp1_ex": hl.tarray(hl.tstr),
    "filter_snp1_gen": hl.tarray(hl.tstr),
    "filter_snp2_ex": hl.tarray(hl.tstr),
    "filter_snp2_gen": hl.tarray(hl.tstr),
    "gene_id": hl.tstr,
    "gene_name": hl.tstr,
    "locus.contig": hl.tstr,
    "locus.position": hl.tint,
    "mnv_amino_acids": hl.tstr,
    "mnv_codons": hl.tstr,
    "mnv_consequence": hl.tstr,
    "mnv_lof": hl.tstr,
    "mnv": hl.tstr,
    "n_homhom_ex": hl.tint,
    "n_homhom_gen": hl.tint,
    "n_homhom": hl.tint,
    "n_indv_ex": hl.tint,
    "n_indv_gen": hl.tint,
    "n_indv": hl.tint,
    "snp1_amino_acids": hl.tstr,
    "snp1_codons": hl.tstr,
    "snp1_consequence": hl.tstr,
    "snp1_lof": hl.tstr,
    "snp1": hl.tstr,
    "snp2_amino_acids": hl.tstr,
    "snp2_codons": hl.tstr,
    "snp2_consequence": hl.tstr,
    "snp2_lof": hl.tstr,
    "snp2": hl.tstr,
    "transcript_id": hl.tstr,
}


ds = hl.import_table(temp_csv, key="mnv", missing="", quote="'", types=column_types)

###########
# Prepare #
###########

ds = ds.transmute(locus=hl.locus(ds["locus.contig"], ds["locus.position"]))

ds = ds.transmute(
    contig=get_expr_for_contig(ds.locus),
    pos=ds.locus.position,
    xpos=get_expr_for_xpos(ds.locus),
)

ds = ds.transmute(
    ac=hl.struct(
        **{
            var: hl.struct(
                total=ds[f"AC_{var}"],
                exome=ds[f"AC_{var}_ex"],
                genome=ds[f"AC_{var}_gen"],
            )
            for var in ["snp1", "snp2", "mnv"]
        }
    )
)

ds = ds.transmute(
    an=hl.struct(
        **{
            var: hl.struct(
                total=hl.or_else(hl.int(ds[f"AN_{var}_ex"]), 0)
                + hl.or_else(hl.int(ds[f"AN_{var}_gen"]), 0),
                exome=hl.int(ds[f"AN_{var}_ex"]),
                genome=hl.int(ds[f"AN_{var}_gen"]),
            )
            for var in ["snp1", "snp2"]
        }
    )
)

ds = ds.transmute(
    filters=hl.struct(
        **{
            var: hl.struct(exome=ds[f"filter_{var}_ex"], genome=ds[f"filter_{var}_gen"])
            for var in ["snp1", "snp2"]
        }
    )
)

ds = ds.transmute(
    consequence=hl.struct(
        category=ds.categ,
        gene_id=ds.gene_id,
        gene_name=ds.gene_name,
        transcript_id=ds.transcript_id,
        **{
            var: hl.struct(
                amino_acids=ds[f"{var}_amino_acids"],
                codons=ds[f"{var}_codons"],
                consequence=ds[f"{var}_consequence"],
                lof=ds[f"{var}_lof"],
            )
            for var in ["snp1", "snp2", "mnv"]
        },
    )
)

ds = ds.transmute(
    **{
        field: hl.struct(
            total=ds[field], exome=ds[f"{field}_ex"], genome=ds[f"{field}_gen"]
        )
        for field in ["n_indv", "n_homhom"]
    }
)

# Collapse table to one row per MNV, with all consequences for the MNV collected into an array
consequences = ds.group_by(ds.mnv).aggregate(
    consequences=hl.agg.collect(ds.consequence)
)
ds = ds.drop("consequence")
ds = ds.distinct()
ds = ds.join(consequences)

# Sort consequences by severity
ds = ds.annotate(
    consequences=hl.sorted(
        ds.consequences,
        key=lambda c: CONSEQUENCE_TERM_RANK_LOOKUP.get(c.mnv.consequence),
    )
)

ds = ds.key_by()

#########
# Write #
#########

ds.write(args.output_url)

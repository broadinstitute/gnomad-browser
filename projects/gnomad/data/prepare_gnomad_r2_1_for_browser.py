import argparse
import itertools

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    get_expr_for_alt_allele,
    get_expr_for_contig,
    get_expr_for_consequence_lc_lof_flag,
    get_expr_for_variant_lc_lof_flag,
    get_expr_for_genes_with_lc_lof_flag,
    get_expr_for_consequence_loftee_flag_flag,
    get_expr_for_variant_loftee_flag_flag,
    get_expr_for_genes_with_loftee_flag_flag,
    get_expr_for_ref_allele,
    get_expr_for_variant_id,
    get_expr_for_vep_sorted_transcript_consequences_array,
    get_expr_for_xpos,
)

p = argparse.ArgumentParser()
p.add_argument("--input-url", help="URL of gnomAD 2.1 flattened Hail table to export", required=True)
p.add_argument("--output-url", help="URL to write shaped Hail table to", required=True)
p.add_argument("--subset", help="Filter variants to this chrom:start-end range")
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

# The globals in the flattened Hail table cause a serialization error during export to ES.
ds = ds.select_globals()

if args.subset:
    subset_interval = hl.parse_locus_interval(args.subset)
    ds = ds.filter(subset_interval.contains(ds.locus))

####################
# Top level fields #
####################

# These fields remain at the top level
#
# allele_type
# decoy
# feature_imputed
# filters
# has_star
# n_alt_alleles
# nonpar
# pab_max
# qual
# rf_label
# rf_negative_label
# rf_positive_label
# rf_tp_probability
# rf_train
# rsid
# transmitted_singleton
# variant_type
# was_mixed

# Quality metrics
ds = ds.transmute(
    allele_info=hl.struct(
        BaseQRankSum=ds.BaseQRankSum,
        ClippingRankSum=ds.ClippingRankSum,
        DP=ds.DP,
        FS=ds.FS,
        InbreedingCoeff=ds.InbreedingCoeff,
        MQ=ds.MQ,
        MQRankSum=ds.MQRankSum,
        QD=ds.QD,
        ReadPosRankSum=ds.ReadPosRankSum,
        SOR=ds.SOR,
        VQSLOD=ds.VQSLOD,
        VQSR_culprit=ds.VQSR_culprit,
        VQSR_NEGATIVE_TRAIN_SITE=ds.VQSR_NEGATIVE_TRAIN_SITE,
        VQSR_POSITIVE_TRAIN_SITE=ds.VQSR_POSITIVE_TRAIN_SITE,
    )
)

# Histograms
ds = ds.transmute(
    **{
        histogram: hl.struct(
            bin_edges=ds[f"{histogram}_bin_edges"],
            bin_freq=ds[f"{histogram}_bin_freq"],
            n_larger=ds[f"{histogram}_n_larger"],
            n_smaller=ds[f"{histogram}_n_smaller"],
        )
        for histogram in [
            "ab_hist_alt",
            "dp_hist_all",
            "dp_hist_alt",
            "gq_hist_all",
            "gq_hist_alt",
            "gnomad_age_hist_het",
            "gnomad_age_hist_hom",
        ]
    }
)

# Derived top level fields
ds = ds.annotate(
    alt=get_expr_for_alt_allele(ds),
    chrom=get_expr_for_contig(ds.locus),
    pos=ds.locus.position,
    ref=get_expr_for_ref_allele(ds),
    variant_id=get_expr_for_variant_id(ds),
    xpos=get_expr_for_xpos(ds.locus),
)

###########
# Subsets #
###########

all_subsets = ["gnomad", "controls", "non_cancer", "non_neuro", "non_topmed"]

# There is no separate non-cancer subset for genome data. All genome samples are non-cancer.
subsets = [s for s in all_subsets if f"{s}_AC_adj" in ds.row_value.dtype.fields]

fields_per_subpopulation = ["AC_adj", "AF_adj", "AN_adj", "nhomalt_adj"]

populations = ["afr", "amr", "asj", "eas", "fin", "nfe", "oth", "sas"]

subpopulations = {
    "afr": ["female", "male"],
    "amr": ["female", "male"],
    "asj": ["female", "male"],
    "eas": ["female", "male", "jpn", "kor", "oea"],
    "fin": ["female", "male"],
    "nfe": ["female", "male", "bgr", "est", "nwe", "onf", "seu", "swe"],
    "oth": ["female", "male"],
    "sas": ["female", "male"],
}


def expr_for_field_with_subpopulations(row, subset, field):
    return hl.struct(
        **dict(
            (
                (
                    pop,
                    hl.struct(
                        **dict(
                            (
                                (subpop, row[f"{subset}_{field}_{pop}_{subpop}"])
                                for subpop in subpopulations[pop]
                                if f"{subset}_{field}_{pop}_{subpop}"
                                in row.row_value.dtype.fields  # A subpopulation is not guaranteed to be present in all subsets
                            ),
                            total=row[f"{subset}_{field}_{pop}"],
                        )
                    ),
                )
                for pop in populations
                if f"{subset}_{field}_{pop}"
                in row.row_value.dtype.fields  # Some populations are not present in genomes
            ),
            total=row[f"{subset}_{field}"],
            female=row[f"{subset}_{field}_female"],
            male=row[f"{subset}_{field}_male"],
        )
    )


for subset in subsets:
    for field in fields_per_subpopulation:
        ds = ds.transmute(**{f"{subset}_{field}": expr_for_field_with_subpopulations(ds, subset, field)})


faf_fields = ["faf95_adj", "faf99_adj"]


def expr_for_faf_field(row, subset, field):
    return hl.struct(
        **dict(
            (
                (pop, row[f"{subset}_{field}_{pop}"])
                for pop in ["afr", "amr", "eas", "nfe", "sas"]
                if f"{subset}_{field}_{pop}"
                in row.row_value.dtype.fields  # Some populations are not present in genomes
            ),
            total=row[f"{subset}_{field}"],
        )
    )


ds = ds.transmute(
    **{
        f"{subset}_{field}": expr_for_faf_field(ds, subset, field)
        for subset, field in itertools.product(subsets, faf_fields)
    }
)

other_fields = [
    "AC_popmax",
    "AC_raw",
    "AF_popmax",
    "AF_raw",
    "AN_popmax",
    "AN_raw",
    "nhomalt_popmax",
    "nhomalt_raw",
    "popmax",
]

fields_per_subset = fields_per_subpopulation + faf_fields + other_fields
ds = ds.transmute(
    **{subset: hl.struct(**{field: ds[f"{subset}_{field}"] for field in fields_per_subset}) for subset in subsets}
)

###################
# VEP annotations #
###################

ds = ds.annotate(sortedTranscriptConsequences=get_expr_for_vep_sorted_transcript_consequences_array(vep_root=ds.vep))

ds = ds.annotate(
    flags=hl.struct(
        lc_lof=get_expr_for_variant_lc_lof_flag(ds.sortedTranscriptConsequences),
        lof_flag=get_expr_for_variant_loftee_flag_flag(ds.sortedTranscriptConsequences),
        lcr=ds.lcr,
        segdup=ds.segdup,
    ),
    sortedTranscriptConsequences=hl.bind(
        lambda genes_with_lc_lof_flag, genes_with_loftee_flag_flag: ds.sortedTranscriptConsequences.map(
            lambda csq: csq.annotate(
                flags=hl.struct(
                    lc_lof=get_expr_for_consequence_lc_lof_flag(csq),
                    lc_lof_in_gene=genes_with_lc_lof_flag.contains(csq.gene_id),
                    lof_flag=get_expr_for_consequence_loftee_flag_flag(csq),
                    lof_flag_in_gene=genes_with_loftee_flag_flag.contains(csq.gene_id),
                    nc_transcript=(csq.category == "lof") & (csq.lof == ""),
                )
            )
        ),
        get_expr_for_genes_with_lc_lof_flag(ds.sortedTranscriptConsequences),
        get_expr_for_genes_with_loftee_flag_flag(ds.sortedTranscriptConsequences),
    ),
)

# Drop keys for export to ES
# vep is replaced with sortedTranscriptConsequences
# lcr and segdup are moved to the flags struct
ds = ds.expand_types().drop("locus", "alleles", "vep", "lcr", "segdup")

#########
# Write #
#########

ds.write(args.output_url)

import argparse
import collections

import hail as hl

from data_utils.computed_fields import normalized_contig, variant_id, x_position, sorted_transcript_consequences_v2

from data_utils.computed_fields.flags import (
    get_expr_for_consequence_lc_lof_flag,
    get_expr_for_variant_lc_lof_flag,
    get_expr_for_genes_with_lc_lof_flag,
    get_expr_for_consequence_loftee_flag_flag,
    get_expr_for_variant_loftee_flag_flag,
    get_expr_for_genes_with_loftee_flag_flag,
)


def tree_factory():
    return collections.defaultdict(tree_factory)


def get_freq_index_tree(freq_index_dict):
    tree = tree_factory()

    for labels_combo, index in freq_index_dict.items():
        labels = labels_combo.split("_")
        # Subset labels contain an _, so rebuild those after splitting them
        if labels[0] == "non":
            labels = ["_".join(labels[0:2])] + labels[2:]

        sex = None
        if labels[-1] in ["male", "female"]:
            sex = labels.pop()

        if len(labels) == 3:  # labels contains subset, pop, subpop
            [subset, pop, subpop] = labels
            assert sex is None
            tree[subset][pop][subpop] = index
        elif len(labels) == 2:  # labels contains subset, pop or subset, "raw"
            [subset, pop] = labels
            if pop != "raw":
                tree[subset][pop][sex or "total"] = index
        else:  # labels contains only subset
            assert len(labels) == 1
            subset = labels[0]
            tree[subset][sex or "total"] = index

    return tree


def freq_expression(ds, field, freq_index_tree_slice):
    return hl.struct(
        **{
            key: ds.freq[value][field]
            if isinstance(value, int)
            else freq_expression(ds, field, freq_index_tree_slice[key])
            for key, value in freq_index_tree_slice.items()
        }
    )


def format_variants_table(ds):

    ############################
    # Derived top level fields #
    ############################

    ds = ds.annotate(
        variant_id=variant_id(ds.locus, ds.alleles),
        chrom=normalized_contig(ds.locus),
        pos=ds.locus.position,
        xpos=x_position(ds.locus),
        ref=ds.alleles[0],
        alt=ds.alleles[1],
    )

    ###############
    # Frequencies #
    ###############

    g = hl.eval(ds.globals)

    freq_index_tree = get_freq_index_tree(g.freq_index_dict)

    subsets = list(freq_index_tree.keys())

    ds = ds.annotate(
        **{
            subset: hl.struct(
                # Adjusted frequencies
                AC_adj=freq_expression(ds, "AC", freq_index_tree[subset]),
                AN_adj=freq_expression(ds, "AN", freq_index_tree[subset]),
                AF_adj=freq_expression(ds, "AF", freq_index_tree[subset]),
                nhomalt_adj=freq_expression(ds, "homozygote_count", freq_index_tree[subset]),
                # Raw frequencies
                AC_raw=ds.freq[g.freq_index_dict[f"{subset}_raw"]].AC,
                AN_raw=ds.freq[g.freq_index_dict[f"{subset}_raw"]].AN,
                AF_raw=ds.freq[g.freq_index_dict[f"{subset}_raw"]].AF,
                nhomalt_raw=ds.freq[g.freq_index_dict[f"{subset}_raw"]].homozygote_count,
                # Popmax
                popmax=ds.popmax[g.popmax_index_dict[subset]].pop,
                AC_popmax=ds.popmax[g.popmax_index_dict[subset]].AC,
                AN_popmax=ds.popmax[g.popmax_index_dict[subset]].AN,
                AF_popmax=ds.popmax[g.popmax_index_dict[subset]].AF,
                nhomalt_popmax=ds.popmax[g.popmax_index_dict[subset]].homozygote_count,
            )
            for subset in subsets
        }
    )

    ##############################
    # Filtering allele frequency #
    ##############################

    faf_index_tree = collections.defaultdict(dict)
    for labels_combo, index in g.faf_index_dict.items():
        labels = labels_combo.split("_")
        # Subset labels contain an _, so rebuild those after splitting them
        if labels[0] == "non":
            labels = ["_".join(labels[0:2])] + labels[2:]

        if len(labels) == 2:
            [subset, pop] = labels
            faf_index_tree[subset][pop] = index
        else:
            assert len(labels) == 1
            subset = labels[0]
            faf_index_tree[subset]["total"] = index

    ds = ds.annotate(
        **{
            subset: ds[subset].annotate(
                faf95_adj=hl.struct(**{pop: ds.faf[index].faf95 for pop, index in faf_index_tree[subset].items()}),
                faf99_adj=hl.struct(**{pop: ds.faf[index].faf99 for pop, index in faf_index_tree[subset].items()}),
            )
            for subset in subsets
        }
    )

    ds = ds.drop("freq", "popmax", "faf")

    ##############
    # Histograms #
    ##############

    # Extract overall age distribution
    ds = ds.transmute(
        gnomad_age_hist_het=ds.age_hist_het[g.age_index_dict["gnomad"]],
        gnomad_age_hist_hom=ds.age_hist_hom[g.age_index_dict["gnomad"]],
    )

    # Convert lists of numbers in histograms into pipe delimited strings
    ds = ds.annotate(
        **{
            field: ds[field].annotate(
                bin_freq=hl.delimit(ds[field].bin_freq, "|"), bin_edges=hl.delimit(ds[field].bin_edges, "|")
            )
            for field in [
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

    ###########################
    # Quality metrics / flags #
    ###########################

    # Use the same fields as the VCFs
    # Based https://github.com/macarthur-lab/gnomad_qc/blob/25a81bc2166fbe4ccbb2f7a87d36aba661150413/variant_qc/prepare_data_release.py#L128-L159
    ds = ds.transmute(
        BaseQRankSum=ds.allele_info.BaseQRankSum,
        ClippingRankSum=ds.allele_info.ClippingRankSum,
        DP=ds.allele_info.DP,
        FS=ds.info_FS,
        InbreedingCoeff=ds.info_InbreedingCoeff,
        MQ=ds.info_MQ,
        MQRankSum=ds.info_MQRankSum,
        QD=ds.info_QD,
        ReadPosRankSum=ds.info_ReadPosRankSum,
        rf_negative_label=ds.fail_hard_filters,
        rf_positive_label=ds.tp,
        rf_tp_probability=ds.rf_probability,
        SOR=ds.info_SOR,
        VQSLOD=ds.allele_info.VQSLOD,
        VQSR_culprit=ds.allele_info.culprit,
        VQSR_NEGATIVE_TRAIN_SITE=ds.info_NEGATIVE_TRAIN_SITE,
        VQSR_POSITIVE_TRAIN_SITE=ds.info_POSITIVE_TRAIN_SITE,
    )

    # These fields are left unaltered at the top level
    #
    # allele_type
    # decoy
    # has_star
    # lcr
    # n_alt_alleles
    # nonpar
    # pab_max
    # rf_label
    # rf_train
    # segdup
    # transmitted_singleton
    # variant_type
    # was_mixed

    # TODO: Remove this, leave these at top level
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

    ###################
    # VEP annotations #
    ###################

    ds = ds.annotate(sortedTranscriptConsequences=sorted_transcript_consequences_v2(ds.vep))

    ds = ds.drop("vep")

    #########
    # Flags #
    #########

    # TODO: Leave these at the top level
    ds = ds.transmute(flags=hl.struct(lcr=ds.lcr, segdup=ds.segdup))

    # TODO: Remove this, these flags are calculated on the fly
    ds = ds.annotate(
        flags=ds.flags.annotate(
            lc_lof=get_expr_for_variant_lc_lof_flag(ds.sortedTranscriptConsequences),
            lof_flag=get_expr_for_variant_loftee_flag_flag(ds.sortedTranscriptConsequences),
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

    #################
    # Unused fields #
    #################

    # These fields were not in the 2.1.1 browser Hail table

    ds = ds.drop(
        "adj_biallelic_rank",
        "adj_biallelic_singleton_rank",
        "adj_rank",
        "adj_singleton_rank",
        "biallelic_rank",
        "biallelic_singleton_rank",
        "info_DP",
        "mills",
        "n_nonref",
        "omni",
        "qd",
        "rank",
        "score",
        "singleton_rank",
        "singleton",
        "was_split",
    )

    # These two fields appear only in the genomes table
    if "_score" in ds.row_value.dtype.fields:
        ds = ds.drop("_score", "_singleton")

    ########
    # Keys #
    ########

    # Drop key fields
    ds = ds.key_by().drop("locus", "alleles")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = hl.read_table(args.input)
    ds = format_variants_table(ds)

    ds.describe()

    ds.write(args.output)


if __name__ == "__main__":
    main()

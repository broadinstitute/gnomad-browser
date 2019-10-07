import argparse
import collections

import hail as hl

from data_utils.computed_fields import variant_id, variant_ids, x_position, sorted_transcript_consequences_v3


def tree_factory():
    return collections.defaultdict(tree_factory)


def get_freq_index_tree(freq_meta):
    tree = tree_factory()

    for index, meta in enumerate(freq_meta):
        if "pop" in meta:
            tree[meta["group"]]["populations"][meta["pop"]][meta.get("sex", "total")] = index
        else:
            tree[meta["group"]][meta.get("sex", "total")] = index

    return tree


def get_faf_index_tree(faf_index_dict):
    faf_index_tree = collections.defaultdict(dict)
    for labels_combo, index in faf_index_dict.items():
        labels = labels_combo.split("_")
        if len(labels) == 2:  # group, pop
            [group, pop] = labels
            faf_index_tree[group][pop] = index
        else:
            assert len(labels) == 1
            group = labels[0]
            faf_index_tree[group]["total"] = index

    return faf_index_tree


def array_to_tree(array, index_tree, f=lambda s: s):
    return hl.struct(
        **{
            key: f(array[value]) if isinstance(value, int) else array_to_tree(array, index_tree[key], f)
            for key, value in index_tree.items()
        }
    )


def format_variants_table(ds):

    g = hl.eval(ds.globals)

    ############################
    # Derived top level fields #
    ############################

    ds = ds.annotate(variant_id=variant_id(ds.locus, ds.alleles), xpos=x_position(ds.locus))

    ds = ds.annotate(
        multiallelic_variants=variant_ids(ds.old_locus, ds.old_alleles).filter(lambda vid: vid != ds.variant_id)
    )

    ###############
    # Frequencies #
    ###############

    freq_index_tree = get_freq_index_tree(g.freq_meta)
    ds = ds.annotate(freq=array_to_tree(ds.freq, freq_index_tree))

    ##############################
    # Filtering allele frequency #
    ##############################

    faf_index_tree = get_faf_index_tree(g.faf_index_dict)
    ds = ds.annotate(faf=array_to_tree(ds.faf, faf_index_tree, lambda faf: faf.select("faf95", "faf99")))

    ##############
    # Histograms #
    ##############

    # Convert lists of numbers in histograms into pipe delimited strings
    ds = ds.annotate(
        **{
            field: ds[field].annotate(
                bin_freq=hl.delimit(ds[field].bin_freq, "|"), bin_edges=hl.delimit(ds[field].bin_edges, "|")
            )
            for field in ["ab_hist_alt", "dp_hist_all", "dp_hist_alt", "gq_hist_all", "gq_hist_alt"]
        }
    )

    ###########################
    # Quality metrics / flags #
    ###########################

    # These fields are nested under `info`
    #
    # AS_VQSLOD
    # culprit
    # DP
    # FS
    # InbreedingCoeff
    # MQ
    # MQ_DP
    # MQRankSum
    # NEGATIVE_TRAIN_SITE
    # POSITIVE_TRAIN_SITE
    # QD
    # QUALapprox
    # RAW_MQ
    # ReadPosRankSum
    # SB
    # SOR
    # VarDP

    ###################
    # VEP annotations #
    ###################

    ds = ds.annotate(sorted_transcript_consequences=sorted_transcript_consequences_v3(ds.vep))

    ds = ds.drop("vep")

    ################
    # Other fields #
    ################

    # These fields are left unaltered at the top level
    #
    # decoy
    # filters
    # info
    # lcr
    # nonpar
    # popmax
    # qual
    # rsid

    # Drop fields created by splitting multi-allelic variants
    # This information is captured in the multiallelic_variants derived field
    ds = ds.drop("a_index", "old_locus", "old_alleles", "was_split")

    # Internal only
    # TODO: Remove line, this field won't be in the final table
    if "project_max" in ds.row_value.dtype.fields:
        ds = ds.drop("project_max")

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

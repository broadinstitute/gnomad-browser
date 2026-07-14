"""Export locus and alleles for gnomAD variants to a sharded VCF."""

import argparse

import hail as hl

from core.config import DATASETS
from core.enums import DataType

DEFAULT_N_PARTITIONS = 5000


def select_locus_alleles(ds: hl.Table, n_partitions: int | None = None) -> hl.Table:
    """Strip a Hail Table down to its locus/alleles key, optionally repartitioning."""
    ds = ds.select_globals()
    ds = ds.select()
    if n_partitions is not None:
        ds = ds.repartition(n_partitions, shuffle=True)
    return ds


def get_gnomad_v4_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v4 variants."""
    ds = hl.read_table(DATASETS["gnomAD v4.0"])
    return select_locus_alleles(ds, n_partitions=DEFAULT_N_PARTITIONS)


def get_gnomad_v3_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v3 variants."""
    ds = hl.read_table(DATASETS["gnomAD v3.1.1"])
    return select_locus_alleles(ds, n_partitions=DEFAULT_N_PARTITIONS)


def get_gnomad_v2_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v2 variants."""
    exomes = select_locus_alleles(hl.read_table(DATASETS["gnomAD v2.1.1"][DataType.EXOMES]))
    genomes = select_locus_alleles(hl.read_table(DATASETS["gnomAD v2.1.1"][DataType.GENOMES]))

    ds = exomes.join(genomes, how="outer")
    return ds.repartition(DEFAULT_N_PARTITIONS, shuffle=True)


def get_exac_variants() -> hl.Table:
    """Get locus/alleles for all ExAC variants."""
    ds = hl.import_vcf(
        DATASETS["ExAC"],
        force_bgz=True,
        skip_invalid_loci=True,
    ).rows()
    ds = ds.select_globals()
    ds = hl.split_multi(ds)
    ds = ds.select()
    return ds.repartition(200, shuffle=True)


VARIANT_GETTERS = {
    "gnomAD v4.0": get_gnomad_v4_variants,
    "gnomAD v3.1.1": get_gnomad_v3_variants,
    "gnomAD v2.1.1": get_gnomad_v2_variants,
    "ExAC": get_exac_variants,
}


VARIANT_GETTERS = {
    "gnomAD v4.0": get_gnomad_v4_variants,
    "gnomAD v3.1.1": get_gnomad_v3_variants,
    "gnomAD v2.1.1": get_gnomad_v2_variants,
    "ExAC": get_exac_variants,
}


def get_variants(dataset: str) -> hl.Table:
    """Get locus/alleles for all variants in the given dataset."""
    if dataset not in VARIANT_GETTERS:
        raise ValueError(f"Unknown dataset '{dataset}', expected one of {list(VARIANT_GETTERS)}")
    return VARIANT_GETTERS[dataset]()


def export_vcfs(ds: hl.Table, output_url: str) -> None:
    """
    Export locus and alleles fields from a Hail Table to a sharded VCF.

    :param ds: Hail Table.
    :param output_url: URL to directory/prefix where VCFs will be output.
    """
    assert (
        ds.key.dtype.fields == ("locus", "alleles")
        and isinstance(ds.locus.dtype, hl.tlocus)
        and isinstance(ds.alleles.dtype, hl.tarray)
        and ds.alleles.dtype.element_type == hl.tstr
    )
    ds = select_locus_alleles(ds)
    hl.export_vcf(ds, output_url, parallel="separate_header")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", choices=list(DATASETS))
    parser.add_argument("output_url")
    args = parser.parse_args()
    ds = get_variants(args.dataset)
    export_vcfs(ds, args.output_url)


if __name__ == "__main__":
    main()

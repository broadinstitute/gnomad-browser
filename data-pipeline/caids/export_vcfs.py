"""Export locus and alleles for gnomAD variants to a sharded VCF."""

import argparse

import hail as hl


def get_gnomad_v4_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v4 variants."""
    ds = hl.read_table("gs://gcp-public-data--gnomad/release/4.0/ht/genomes/gnomad.genomes.v4.0.sites.ht")
    ds = ds.select_globals()
    ds = ds.select()
    ds = ds.repartition(5000, shuffle=True)
    return ds


def get_gnomad_v3_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v3 variants."""
    ds = hl.read_table("gs://gcp-public-data--gnomad/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht")
    ds = ds.select_globals()
    ds = ds.select()
    ds = ds.repartition(5000, shuffle=True)
    return ds


def get_gnomad_v2_variants() -> hl.Table:
    """Get locus/alleles for all gnomAD v2 variants."""
    exomes = hl.read_table("gs://gcp-public-data--gnomad/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht")
    exomes = exomes.select_globals()
    exomes = exomes.select()

    genomes = hl.read_table("gs://gcp-public-data--gnomad/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht")
    genomes = genomes.select_globals()
    genomes = genomes.select()

    ds = exomes.join(genomes, how="outer")
    ds = ds.repartition(5000, shuffle=True)
    return ds


def get_exac_variants() -> hl.Table:
    """Get locus/alleles for all ExAC variants."""
    ds = hl.import_vcf(
        "gs://gcp-public-data--gnomad/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz",
        force_bgz=True,
        skip_invalid_loci=True,
    ).rows()
    ds = ds.select_globals()
    ds = hl.split_multi(ds)
    ds = ds.select()
    ds = ds.repartition(200, shuffle=True)
    return ds


def get_variants(dataset: str) -> hl.Table:
    """Get locus/alleles for all variants in the given dataset."""
    if dataset == "gnomAD v4.0":
        return get_gnomad_v4_variants()
    if dataset == "gnomAD v3.1.1":
        return get_gnomad_v3_variants()
    if dataset == "gnomAD v2.1.1":
        return get_gnomad_v2_variants()
    if dataset == "ExAC":
        return get_exac_variants()
    raise ValueError(f"Unknown dataset '{dataset}'")


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

    ds = ds.select_globals()
    ds = ds.select()

    hl.export_vcf(ds, output_url, parallel="separate_header")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", choices=("ExAC", "gnomAD v2.1.1", "gnomAD v3.1.1", "gnomAD v4.0"))
    parser.add_argument("output_url")
    args = parser.parse_args()

    hl.init()

    ds = get_variants(args.dataset)
    export_vcfs(ds, args.output_url)


if __name__ == "__main__":
    main()

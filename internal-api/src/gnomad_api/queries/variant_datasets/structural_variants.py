import hail as hl

from ...parameters.types import RegionId
from ...sources import GNOMAD_STRUCTURAL_VARIANTS, GNOMAD_STRUCTURAL_VARIANTS_BY_GENE
from ..helpers import collect


CHROMOSOMES = [str(n) for n in range(1, 23)] + ["X", "Y", "M"]

CHROMOSOME_NUMBERS = {chrom: i + 1 for i, chrom in enumerate(CHROMOSOMES)}


def x_position(chrom, pos):
    return CHROMOSOME_NUMBERS[chrom] * 1e9 + pos


def get_subset_from_dataset_id(dataset_id: str) -> str:
    if dataset_id == "gnomad_sv_r2_1":
        return "all"

    return dataset_id[15:]  # Remove leading "gnomad_sv_r2_1_"


def get_structural_variant_by_id(variant_id: str, dataset_id: str):
    subset = get_subset_from_dataset_id(dataset_id)

    ds = hl.read_table(GNOMAD_STRUCTURAL_VARIANTS)
    ds = ds.filter(ds.variant_id == variant_id)

    ds = ds.filter(ds.freq[subset].ac > 0)
    ds = ds.annotate(**ds.freq[subset])

    variant = ds.collect()

    if not variant:
        return None

    return variant[0]


def get_structural_variants_by_gene(gene_symbol: str, dataset_id: str):
    subset = get_subset_from_dataset_id(dataset_id)

    ds = hl.read_table(GNOMAD_STRUCTURAL_VARIANTS_BY_GENE)
    ds = ds.filter(ds.gene_symbol == gene_symbol)

    ds = ds.annotate(
        variants=ds.variants.map(
            lambda v: v.drop(
                "age_distribution",
                "algorithms",
                "alts",
                "consequences",
                "cpx_intervals",
                "cpx_type",
                "evidence",
                "genotype_quality",
                "qual",
            )
        )
    )

    rows = ds.collect()
    if not rows:
        return []

    variants = rows[0].variants

    variants = [
        v.annotate(**v.freq[subset].drop("copy_numbers", "populations")) for v in variants if v.freq[subset].ac > 0
    ]

    return variants


def should_include_variant_in_region(region_id: RegionId, variant):
    # Only include insertions if the start point falls within the requested region.
    if variant["type"] == "INS":
        return (
            variant["chrom"] == region_id.chrom
            and variant["pos"] >= region_id.start
            and variant["pos"] <= region_id.stop
        )

    # Only include interchromosomal variants (CTX, BND) if one of the endpoints falls within the requested region_id.
    # Some INS and CPX variants are also interchromosomal, but those can only be queried on their first position.
    if variant["type"] == "BND" or variant["type"] == "CTX":
        return (
            variant["chrom"] == region_id.chrom
            and variant["pos"] >= region_id.start
            and variant["pos"] <= region_id.stop
        ) or (
            variant["chrom2"] == region_id.chrom
            and variant["pos2"] >= region_id.start
            and variant["pos2"] <= region_id.stop
        )

    return True


def get_structural_variants_by_region(region_id: RegionId, dataset_id: str):
    xstart = x_position(region_id.chrom, region_id.start)
    xstop = x_position(region_id.chrom, region_id.stop)

    subset = get_subset_from_dataset_id(dataset_id)

    ds = hl.read_table(GNOMAD_STRUCTURAL_VARIANTS)
    ds = ds.filter(((ds.xend >= xstart) & (ds.xpos <= xstop)) | ((ds.xend2 >= xstart) & (ds.xpos2 <= xstop)))

    ds = ds.filter(ds.freq[subset].ac > 0)
    ds = ds.annotate(**ds.freq[subset])

    ds = ds.drop(
        "age_distribution",
        "algorithms",
        "alts",
        "consequences",
        "copy_numbers",
        "cpx_intervals",
        "cpx_type",
        "evidence",
        "genes",
        "genotype_quality",
        "populations",
        "qual",
    )

    variants = collect(ds)

    variants = [variant for variant in variants if should_include_variant_in_region(region_id, variant)]

    return variants

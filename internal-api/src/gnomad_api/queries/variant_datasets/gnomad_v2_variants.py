import typing

import hail as hl

from ...exceptions import ValidationError
from ...parameters.types import RegionId, VariantId
from ...sources import GNOMAD_V2_VARIANTS
from ..helpers import collect
from .shared_fields.flags import get_flags


def format_variant(variant):
    flags = get_flags(variant)
    transcript_consequences = variant.pop("transcript_consequences")
    return {
        **variant,
        "transcript_consequence": (transcript_consequences or [None])[0],
        "flags": flags,
    }


def get_subset_from_dataset_id(dataset_id: str) -> str:
    if dataset_id == "gnomad_r2_1":
        return "gnomad"

    return dataset_id[12:]  # Remove leading "gnomad_r2_1_"


def get_variant_by_id(variant_id: VariantId, dataset_id: str):
    subset = get_subset_from_dataset_id(dataset_id)
    genome_subset = "gnomad" if subset == "non_cancer" else subset

    ds = hl.read_table(GNOMAD_V2_VARIANTS)

    ds = hl.filter_intervals(
        ds,
        [hl.locus_interval(variant_id.chrom, variant_id.position, variant_id.position + 1, reference_genome="GRCh37")],
    )
    ds = ds.filter(ds.variant_id == str(variant_id))

    ds = ds.annotate(
        exome=ds.exome.annotate(**ds.exome.freq[subset]),
        genome=ds.genome.annotate(**ds.genome.freq[genome_subset]),
        colocated_variants=ds.colocated_variants[subset],
    )

    # If raw allele count in the selected subset is 0, nullify exome/genome to indicate that
    # the variant is not found in that subset.
    ds = ds.annotate(
        exome=hl.or_missing(ds.exome.ac_raw > 0, ds.exome), genome=hl.or_missing(ds.genome.ac_raw > 0, ds.genome),
    )

    variant = ds.collect()

    if not variant:
        return None

    variant = dict(variant[0])
    return {
        **variant,
        "flags": get_flags(variant),
    }


def get_variants_by_gene(gene_id: str, dataset_id: str, intervals: typing.List[hl.Interval] = None):
    subset = get_subset_from_dataset_id(dataset_id)
    genome_subset = "gnomad" if subset == "non_cancer" else subset

    ds = hl.read_table(GNOMAD_V2_VARIANTS)

    if intervals:
        ds = hl.filter_intervals(ds, intervals)

    ds = ds.annotate(transcript_consequences=ds.transcript_consequences.filter(lambda csq: csq.gene_id == gene_id))

    ds = ds.filter(
        (hl.len(ds.transcript_consequences) > 0)
        & ((ds.exome.freq[subset].ac_raw > 0) | (ds.genome.freq[genome_subset].ac_raw > 0))
    )

    ds = ds.annotate(
        exome=ds.exome.annotate(**ds.exome.freq[subset]),
        genome=ds.genome.annotate(**ds.genome.freq[genome_subset]),
        colocated_variants=ds.colocated_variants[subset],
    )

    # If raw allele count in the selected subset is 0, nullify exome/genome to indicate that
    # the variant is not found in that subset.
    ds = ds.annotate(
        exome=hl.or_missing(ds.exome.ac_raw > 0, ds.exome), genome=hl.or_missing(ds.genome.ac_raw > 0, ds.genome),
    )

    ds = ds.annotate(
        exome=ds.exome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.exome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
        genome=ds.genome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.genome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
    )

    variants = collect(ds)

    result = [format_variant(variant) for variant in variants]

    return result


def get_variants_by_region(region_id: RegionId, dataset_id: str):
    subset = get_subset_from_dataset_id(dataset_id)
    genome_subset = "gnomad" if subset == "non_cancer" else subset

    ds = hl.read_table(GNOMAD_V2_VARIANTS)

    ds = hl.filter_intervals(
        ds,
        [
            hl.locus_interval(
                region_id.chrom, region_id.start, region_id.stop, reference_genome="GRCh37", includes_end=True,
            )
        ],
    )
    ds = ds.filter((ds.exome.freq[subset].ac_raw > 0) | (ds.genome.freq[genome_subset].ac_raw > 0))

    # Skip this check for small regions where we can assume there are few variants.
    if region_id.stop - region_id.start > 1_000:
        if ds.count() > 30_000:
            raise ValidationError(
                "Individual variants can only be returned for regions with fewer than 30,000 variants"
            )

    ds = ds.annotate(
        exome=ds.exome.annotate(**ds.exome.freq[subset]),
        genome=ds.genome.annotate(**ds.genome.freq[genome_subset]),
        colocated_variants=ds.colocated_variants[subset],
    )

    # If raw allele count in the selected subset is 0, nullify exome/genome to indicate that
    # the variant is not found in that subset.
    ds = ds.annotate(
        exome=hl.or_missing(ds.exome.ac_raw > 0, ds.exome), genome=hl.or_missing(ds.genome.ac_raw > 0, ds.genome),
    )

    ds = ds.annotate(
        exome=ds.exome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.exome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
        genome=ds.genome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.genome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
    )

    variants = collect(ds)

    return [format_variant(variant) for variant in variants]


def get_variants_by_transcript(transcript_id: str, dataset_id: str, intervals: typing.List[hl.Interval] = None):
    subset = get_subset_from_dataset_id(dataset_id)
    genome_subset = "gnomad" if subset == "non_cancer" else subset

    ds = hl.read_table(GNOMAD_V2_VARIANTS)

    if intervals:
        ds = hl.filter_intervals(ds, intervals)

    ds = ds.annotate(
        transcript_consequences=ds.transcript_consequences.filter(lambda csq: csq.transcript_id == transcript_id)
    )

    ds = ds.filter(
        (hl.len(ds.transcript_consequences) > 0)
        & ((ds.exome.freq[subset].ac_raw > 0) | (ds.genome.freq[genome_subset].ac_raw > 0))
    )

    ds = ds.annotate(
        exome=ds.exome.annotate(**ds.exome.freq[subset]),
        genome=ds.genome.annotate(**ds.genome.freq[genome_subset]),
        colocated_variants=ds.colocated_variants[subset],
    )

    # If raw allele count in the selected subset is 0, nullify exome/genome to indicate that
    # the variant is not found in that subset.
    ds = ds.annotate(
        exome=hl.or_missing(ds.exome.ac_raw > 0, ds.exome), genome=hl.or_missing(ds.genome.ac_raw > 0, ds.genome),
    )

    ds = ds.annotate(
        exome=ds.exome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.exome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
        genome=ds.genome.drop("age_distribution", "quality_metrics", "faf95", "faf99").annotate(
            populations=ds.genome.populations.filter(lambda pop: ~pop.id.contains("_"))
        ),
    )

    variants = collect(ds)

    return [format_variant(variant) for variant in variants]

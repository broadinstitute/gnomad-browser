import typing

import hail as hl

from ...exceptions import ValidationError
from ...parameters.types import RegionId, VariantId
from ..helpers import collect


def format_variant(variant):
    transcript_consequences = variant.pop("transcript_consequences")
    return {
        **variant,
        "transcript_consequence": (transcript_consequences or [None])[0],
    }


def get_clinvar_variant_by_id(
    table_path: str, variant_id: VariantId, reference_genome: str
) -> typing.Optional[hl.Struct]:
    ds = hl.read_table(table_path)

    ds = hl.filter_intervals(
        ds,
        [
            hl.locus_interval(
                "chr" + variant_id.chrom if reference_genome == "GRCh38" else variant_id.chrom,
                variant_id.position,
                variant_id.position + 1,
                reference_genome=reference_genome,
            )
        ],
    )
    ds = ds.filter(ds.variant_id == str(variant_id))

    variant = ds.collect()

    if not variant:
        return None

    variant = variant[0]

    return variant


def get_clinvar_variants_by_gene(
    table_path: str, gene_id: str, intervals: typing.List[hl.Interval] = None
) -> typing.List[hl.Struct]:
    ds = hl.read_table(table_path)

    if intervals:
        ds = hl.filter_intervals(ds, intervals)

    ds = ds.annotate(transcript_consequences=ds.transcript_consequences.filter(lambda csq: csq.gene_id == gene_id))
    ds = ds.filter(hl.len(ds.transcript_consequences) > 0)

    variants = collect(ds)

    return [format_variant(variant) for variant in variants]


def get_clinvar_variants_by_region(
    table_path: str, region_id: RegionId, reference_genome: str
) -> typing.List[hl.Struct]:
    ds = hl.read_table(table_path)

    ds = hl.filter_intervals(
        ds,
        [
            hl.locus_interval(
                "chr" + region_id.chrom if reference_genome == "GRCh38" else region_id.chrom,
                region_id.start,
                region_id.stop,
                reference_genome=reference_genome,
                includes_end=True,
            )
        ],
    )

    # Skip this check for small regions where we can assume there are few variants.
    if region_id.stop - region_id.start > 1_000:
        if ds.count() > 30_000:
            raise ValidationError(
                "Individual variants can only be returned for regions with fewer than 30,000 variants"
            )

    variants = collect(ds)

    return [format_variant(variant) for variant in variants]


def get_clinvar_variants_by_transcript(
    table_path: str, transcript_id: str, intervals: typing.List[hl.Interval] = None
) -> typing.List[hl.Struct]:
    ds = hl.read_table(table_path)

    if intervals:
        ds = hl.filter_intervals(ds, intervals)

    ds = ds.annotate(
        transcript_consequences=ds.transcript_consequences.filter(lambda csq: csq.transcript_id == transcript_id)
    )
    ds = ds.filter(hl.len(ds.transcript_consequences) > 0)

    variants = collect(ds)

    return [format_variant(variant) for variant in variants]

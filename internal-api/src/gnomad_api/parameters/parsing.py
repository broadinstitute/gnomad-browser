import re
import typing

import hail as hl

from ..exceptions import ValidationError
from .types import ReferenceGenome, RegionId, VariantId


def parse_reference_genome(reference_genome: str) -> ReferenceGenome:
    if reference_genome not in ("GRCh37", "GRCh38"):
        raise ValueError("Invalid reference genome: must be one of GRCh37, GRCh38")

    return reference_genome


REGION_ID_REGEX = r"^(chr)?(\d+|x|y|m)[-:]([0-9,]+)[-:]([0-9,]+)$"


def parse_region_id(region_id: str) -> RegionId:
    match = re.match(REGION_ID_REGEX, region_id, re.IGNORECASE)
    if not match:
        raise ValidationError("Invalid region ID")

    chrom = match[2].upper()
    if chrom not in ("X", "Y", "M"):
        chrom_number = int(chrom)
        if chrom_number < 1 or chrom_number > 22:
            raise ValidationError("Invalid region ID: chrom must be one of 1-22, X, Y, M")

    start = int(match[3])
    stop = int(match[4])

    if start < 1:
        raise ValidationError("Invalid region ID: start must be greater than 0")

    # TODO: Check against actual contig length
    if start >= 1e9:
        raise ValidationError("Invalid region ID: start must be less than 1,000,000,000")

    if stop < 1:
        raise ValidationError("Invalid region ID: stop must be greater than 0")

    # TODO: Check against actual contig length
    if stop >= 1e9:
        raise ValidationError("Invalid region ID: stop must be less than 1,000,000,000")

    if start > stop:
        raise ValidationError("Invalid region ID: stop must be greater than region start")

    return RegionId(chrom, start, stop)


VARIANT_ID_REGEX = r"^(chr)?(\d+|x|y|m)[-:]([0-9,]+)[-:]([acgt]+)[-:]([acgt]+)$"


def parse_variant_id(variant_id: str) -> VariantId:
    match = re.match(VARIANT_ID_REGEX, variant_id, re.IGNORECASE)
    if not match:
        raise ValidationError("Invalid variant ID")

    chrom = match[2].upper()
    if chrom not in ("X", "Y"):
        chrom_number = int(chrom)
        if chrom_number < 1 or chrom_number > 22:
            raise ValidationError("Invalid variant ID: chrom must be one of 1-22, X, Y, M")

    position = int(match[3])

    if position < 1:
        raise ValidationError("Invalid variant ID: position must be greater than 0")

    # TODO: Check against actual contig length
    if position >= 1e9:
        raise ValidationError("Invalid variant ID: position must be less than 1,000,000,000")

    ref = match[4]
    alt = match[5]

    return VariantId(chrom, position, ref, alt)


INTERVALS_REGEX = r"^((\d+|x|y|m):([0-9]+)-([0-9]+))(,(\d+|x|y|m):([0-9]+)-([0-9]+))+$"


def parse_intervals(intervals_string: str, reference_genome: ReferenceGenome) -> typing.List[hl.Interval]:
    if not intervals_string:
        return []

    match = re.match(INTERVALS_REGEX, intervals_string, re.IGNORECASE)
    if not match:
        raise ValidationError("Invalid intervals")

    intervals = []
    for interval_str in intervals_string.split(","):
        chrom, positions = interval_str.split(":")
        contig = chrom if reference_genome == "GRCh37" else "chr" + chrom

        start, stop = positions.split("-")

        interval = hl.Interval(
            hl.Locus(contig, int(start), reference_genome=reference_genome),
            hl.Locus(contig, int(stop), reference_genome=reference_genome),
        )

        intervals.append(interval)

    return intervals

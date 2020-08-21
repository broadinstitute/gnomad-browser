import typing


class RegionId(typing.NamedTuple):
    chrom: str
    start: int
    stop: int


class VariantId(typing.NamedTuple):
    chrom: str
    pos: int
    ref: str
    alt: str

import typing


ReferenceGenome = str


class RegionId(typing.NamedTuple):
    chrom: str
    start: int
    stop: int

    def __str__(self):
        return f"{self.chrom}-{self.start}-{self.stop}"


class VariantId(typing.NamedTuple):
    chrom: str
    position: int
    ref_allele: str
    alt_allele: str

    def __str__(self):
        return f"{self.chrom}-{self.position}-{self.ref_allele}-{self.alt_allele}"

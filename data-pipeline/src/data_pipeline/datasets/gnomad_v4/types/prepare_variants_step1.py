import attr
from typing import List, Set, Union, Optional, Any


from data_pipeline.datasets.gnomad_v4.types.initial_variant import (
    Faf,
    FafMax,
    Grpmax,
    InSilicoPredictors,
    Vep,
    Locus,
)
from pandas.core.frame import Frequency


@attr.define
class AncestryGroup:
    id: str
    ac: int
    an: int
    hemizygote_count: int
    homozygote_count: int


@attr.define
class Freq:
    ac: int
    ac_raw: int
    an: int
    hemizygote_count: int
    homozygote_count: int
    ancestry_groups: list[AncestryGroup]


@attr.define
class FreqBySubsetExome:
    all: Freq
    non_ukb: Freq


@attr.define
class FreqBySubsetGenome:
    all: Freq
    tgp: Freq
    hgdp: Freq


@attr.define
class FAF:
    grpmax: Optional[float]
    grpmax_gen_anc: Optional[str]


@attr.define
class BinDetails:
    bin_edges: list[float]
    bin_freq: list[int]
    n_smaller: int
    n_larger: int


@attr.define
class MetricsDetail:
    bin_edges: list[float]
    bin_freq: list[int]
    n_smaller: int
    n_larger: int


@attr.define
class MetricValue:
    metric: str
    value: Union[float, None]  # Is it OK if some are none?


@attr.define
class AlleleBalanceQualityMetrics:
    alt_adj: MetricsDetail
    alt_raw: MetricsDetail


@attr.define
class GenotypeDepthQualityMetrics:
    all_adj: MetricsDetail
    all_raw: MetricsDetail
    alt_adj: MetricsDetail
    alt_raw: MetricsDetail


@attr.define
class GenotypeQualityQualityMetrics:
    all_adj: MetricsDetail
    all_raw: MetricsDetail
    alt_adj: MetricsDetail
    alt_raw: MetricsDetail


@attr.define
class QualityMetrics:
    allele_balance: AlleleBalanceQualityMetrics
    genotype_depth: GenotypeDepthQualityMetrics
    genotype_quality: GenotypeQualityQualityMetrics
    site_quality_metrics: List[MetricValue]


@attr.define
class AgeDistributions:
    het: BinDetails
    hom: BinDetails


@attr.define
class ColocatedVariantsExome:
    all: List[str]
    non_ukb: Union[List[str], None]


@attr.define
class ColocatedVariantsGenome:
    all: List[str]
    hgdp: Union[List[str], None]
    tgp: Union[List[str], None]


@attr.define
class ColocatedVariants:
    all: List[str]
    non_ukb: Union[List[str], None]
    hgdp: Union[List[str], None]
    tgp: Union[List[str], None]


@attr.define
class Gnomad:
    freq: Union[FreqBySubsetExome, FreqBySubsetGenome]
    faf95: FAF
    faf99: FAF

    fafmax: Any

    age_distribution: AgeDistributions
    filters: set[str]
    quality_metrics: QualityMetrics

    flags: set[str]
    subsets: set[str]

    colocated_variants: Union[ColocatedVariantsExome, ColocatedVariantsGenome]

    grpmax: Optional[Any] = None
    faf: Optional[Any] = None


@attr.define
class Variant:
    locus: Locus
    alleles: list[str]
    # grpmax: Grpmax
    rsids: Union[Set[str], None]
    vep: Union[Vep, None]
    in_silico_predictors: InSilicoPredictors
    variant_id: str
    colocated_variants: ColocatedVariants
    exome: Optional[Gnomad]
    genome: Optional[Gnomad]
    faf95_joint: FAF
    faf99_joint: FAF
    # subsets: set[str]
    # flags: set[str]

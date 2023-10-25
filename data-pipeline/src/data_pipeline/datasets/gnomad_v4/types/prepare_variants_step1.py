import attr
from typing import List, Set, Union


from data_pipeline.datasets.gnomad_v4.types.initial_variant import (
    Faf,
    FafMax,
    FafMaxBySubset,
    Grpmax,
    GrpmaxBySubset,
    InSilicoPredictors,
    JointFafMax,
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
class FreqBySubset:
    all: Freq
    non_ukb: Freq


@attr.define
class FAF:
    grpmax: float
    grpmax_gen_anc: str


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
    freq: FreqBySubset
    faf95: FAF
    faf99: FAF

    fafmax: FafMaxBySubset
    joint_freq: Union[List[Frequency], None]
    joint_grpmax: Union[Grpmax, None]
    joint_faf: Union[List[Union[Faf, None]], None]
    joint_fafmax: Union[JointFafMax, None]

    age_distribution: AgeDistributions
    filters: set[str]
    quality_metrics: QualityMetrics

    flags: set[str]
    subsets: set[str]
    colocated_variants: Union[ColocatedVariantsExome, ColocatedVariantsGenome]


@attr.define
class Variant:
    locus: Locus
    alleles: list[str]
    grpmax: GrpmaxBySubset
    rsids: Union[Set[str], None]
    vep: Union[Vep, None]
    in_silico_predictors: InSilicoPredictors
    variant_id: str
    colocated_variants: ColocatedVariants
    exome: Gnomad
    genome: Gnomad
    subsets: set[str]
    flags: set[str]

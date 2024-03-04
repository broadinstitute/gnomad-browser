from typing import Union
import attr
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step1 import Variant as Step1Variant


@attr.define
class CoverageDetail:
    mean: float
    median: int
    over_1: float
    over_5: float
    over_10: float
    over_15: float
    over_20: float
    over_25: float
    over_30: float
    over_50: float
    over_100: float


@attr.define
class Coverage:
    exome: Union[CoverageDetail, None]
    genome: Union[CoverageDetail, None]


@attr.define
class Variant(Step1Variant):
    coverage: Coverage

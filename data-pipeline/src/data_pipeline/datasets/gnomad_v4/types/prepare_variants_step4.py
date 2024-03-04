import attr

from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step3 import Variant as Step3Variant


@attr.define
class Variant(Step3Variant):
    caid: str

import hail as hl

from ...parameters.types import VariantId
from ...sources import GNOMAD_V2_MULTI_NUCLEOTIDE_VARIANTS


def get_multi_nucleotide_variant_by_id(variant_id: VariantId):
    ds = hl.read_table(GNOMAD_V2_MULTI_NUCLEOTIDE_VARIANTS)

    ds = ds.filter(ds.variant_id == str(variant_id))

    variant = ds.collect()

    if not variant:
        return None

    variant = dict(variant[0])
    return variant

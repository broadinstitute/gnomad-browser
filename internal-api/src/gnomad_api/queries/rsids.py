import typing

import hail as hl

from ..sources import RSID_INDEX

def get_variants_by_rsid(rsid: str) -> typing.List[str]:
    ds = hl.read_table(RSID_INDEX)

    rsids = ds.filter(ds.rsid == rsid).collect()

    if not rsids:
        return []

    return rsids[0].variant_ids

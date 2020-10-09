import typing

import hail as hl


def get_variants_by_rsid(ds: hl.Table, rsid: str) -> typing.List[str]:
    rsids = ds.filter(ds.rsid == rsid).collect()

    if not rsids:
        return []

    return rsids[0].variant_ids

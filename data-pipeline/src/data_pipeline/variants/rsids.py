import hail as hl

from data_pipeline.variants.variant_id import variant_id


def collect_rsids(variants_paths):
    ds = None

    for path in variants_paths:
        variants = hl.read_table(path)
        variants = variants.select_globals()
        variants = variants.key_by().select("rsid", variant_id=variant_id(variants.locus, variants.alleles))

        if not ds:
            ds = variants
        else:
            ds = ds.union(variants)

    ds = ds.group_by("rsid").aggregate(variant_ids=hl.agg.collect_as_set(ds.variant_id))

    ds = ds.repartition(10_000, shuffle=True)

    return ds

import hail as hl


def prepare_gnomad_v3_genomic_constraint_regions(genomic_constraint_region_table_path):
    ds = hl.import_table(genomic_constraint_region_table_path, force=True)

    ds = ds.select_globals()

    ds = ds.select(
        chrom=hl.str(ds.chrom),
        start=hl.int(ds.start),
        stop=hl.int(ds.end),
        element_id=hl.str(ds.element_id),
        possible=hl.float(ds.possible),
        observed=hl.float(ds.observed),
        expected=hl.float(ds.expected),
        oe=hl.float(ds.oe),
        z=hl.float(ds.z),
        coding_prop=hl.float(ds.coding_prop),
    )

    ds = ds.key_by("element_id")

    return ds

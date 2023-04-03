import hail as hl


def my_import_bed(path):
    ds = hl.import_table(
        path,
        no_header=False,
        delimiter=r"\s+",
        impute=False,
        skip_blank_lines=True,
        types={
            "chrom": hl.tstr,
            "start": hl.tint32,
            "end": hl.tint32,
            "gene": hl.tstr,
        },
    )

    ds = ds.transmute(old_stop=ds.end, old_start=ds.start, symbol=ds.gene)

    ds = ds.annotate(
        start=hl.min(ds.old_stop, ds.old_start),
        stop=hl.max(ds.old_stop, ds.old_start),
        obs_mis=0,
        exp_mis=0,
        obs_exp=0,
        chisq_diff_null=0,
    )

    ds = ds.drop(
        "ccr_pct",
        "ranges",
        "varflag",
        "syn_density",
        "cpg",
        "cov_score",
        "resid",
        "resid_pctile",
        "unique_key",
        "old_start",
        "old_stop",
    )

    # ds = ds.key_by("chrom", "start", "stop")

    return ds


def prepare_gnomad_v2_ccr_for_comparison(path_autosomes, path_xchroms):

    ds_autosomes_2 = my_import_bed(path_autosomes)

    ds_xchroms_2 = my_import_bed(path_xchroms)

    ds_combined = ds_autosomes_2.union(ds_xchroms_2)
    # ds_combined = ds_autosomes_2.union(ds_xchroms_2).distinct()

    print("right heah")
    ds_combined.describe()

    ds_combined = ds_combined.group_by("symbol").aggregate(regions=hl.agg.collect(ds_combined.row_value))

    ds_combined.describe()

    ds_combined = ds_combined.annotate(regions=hl.sorted(ds_combined.regions, lambda region: region.start))

    ds_combined = ds_combined.select(ccr_region=ds_combined.regions)

    return ds_combined


# path1 = '/Users/rgrant/Downloads/ccrs.autosomes.90orhigher.v2.20180420.bed'
# path2 = '/Users/rgrant/Downloads/ccrs.xchrom.90orhigher.v2.20180420.bed'
# path1 = 'gs://gnomad-rgrant-data-pipeline/output/external_sources/ccrs.autosomes.90orhigher.v2.20180420.bed'
# path2 = 'gs://gnomad-rgrant-data-pipeline/output/external_sources/ccrs.xchrom.90orhigher.v2.20180420.bed'

# ds1 = prepare_gnomad_v2_ccr_for_comparison(path1, path2)

# print(ds1.describe())
# print(ds1.show(5))

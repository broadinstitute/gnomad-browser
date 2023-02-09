import hail as hl


def prepare_gnomad_v2_regional_missense_constraint(path):

    ds = hl.read_table(path)

    # TODO: remove this line when this annotation is removed in final dataset
    ds = ds.drop("search_type")

    ds = ds.annotate(
        start=hl.min(ds.interval.start.position, ds.interval.end.position),
        stop=hl.max(ds.interval.start.position, ds.interval.end.position),
    )

    ds = ds.transmute(transcript_id=ds.transcript.split("\\.")[0])

    ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))

    ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))

    ds = ds.select(gnomad_v2_regional_missense_constraint_regions=ds.regions)

    return ds

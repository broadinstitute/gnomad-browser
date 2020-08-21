import hail as hl


def prepare_exac_regional_missense_constraint(path):
    ds = hl.import_table(
        path,
        missing="",
        types={
            "transcript": hl.tstr,
            "gene": hl.tstr,
            "chr": hl.tstr,
            "amino_acids": hl.tstr,
            "genomic_start": hl.tint,
            "genomic_end": hl.tint,
            "obs_mis": hl.tfloat,
            "exp_mis": hl.tfloat,
            "obs_exp": hl.tfloat,
            "chisq_diff_null": hl.tfloat,
            "region_name": hl.tstr,
        },
    )

    ds = ds.annotate(obs_mis=hl.int(ds.obs_mis))

    ds = ds.annotate(start=hl.min(ds.genomic_start, ds.genomic_end), stop=hl.max(ds.genomic_start, ds.genomic_end))

    ds = ds.drop("amino_acids", "chr", "gene", "genomic_start", "genomic_end", "region_name")

    ds = ds.transmute(transcript_id=ds.transcript.split("\\.")[0])

    ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))

    ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))

    ds = ds.select(exac_regional_missense_constraint_regions=ds.regions)

    return ds

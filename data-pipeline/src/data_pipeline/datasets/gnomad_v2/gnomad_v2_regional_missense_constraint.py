import hail as hl


def prepare_gnomad_v2_regional_missense_constraint(path):
    ds = hl.read_table(path)

    # rename key field transcript_id to transcript to allow merging in genes pipeline
    ds_with_rmc = ds.transmute(transcript_id=ds.transcript)
    ds_with_rmc = ds_with_rmc.key_by("transcript_id")
    ds_with_rmc = ds_with_rmc.drop("transcript")

    # explode then collect to rename fields for consistency with ExAC RMC
    ds_with_rmc = ds_with_rmc.explode("regions")
    ds_with_rmc = ds_with_rmc.select(
        regions=hl.struct(
            chrom=ds_with_rmc.regions.start_coordinate.contig,
            start=hl.min(ds_with_rmc.regions.start_coordinate.position, ds_with_rmc.regions.stop_coordinate.position),
            stop=hl.max(ds_with_rmc.regions.start_coordinate.position, ds_with_rmc.regions.stop_coordinate.position),
            aa_start=ds_with_rmc.regions.start_aa,
            aa_stop=ds_with_rmc.regions.stop_aa,
            obs_mis=ds_with_rmc.regions.obs,
            exp_mis=ds_with_rmc.regions.exp,
            obs_exp=ds_with_rmc.regions.oe,
            chisq_diff_null=ds_with_rmc.regions.chisq,
            p_value=ds_with_rmc.regions.p,
        ),
    )
    ds_with_rmc = ds_with_rmc.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds_with_rmc.row_value).regions)

    ds_with_rmc = ds_with_rmc.group_by("transcript_id").aggregate(regions_array=hl.agg.collect(ds_with_rmc.row_value))
    ds_with_rmc = ds_with_rmc.annotate(has_no_rmc_evidence=hl.bool(False))
    ds_with_rmc = ds_with_rmc.annotate(passed_qc=hl.bool(True))
    ds_with_rmc = ds_with_rmc.select(
        has_no_rmc_evidence=ds_with_rmc.has_no_rmc_evidence,
        passed_qc=ds_with_rmc.passed_qc,
        regions=hl.sorted(ds_with_rmc.regions_array[0].regions, lambda region: region.start),
    )

    # create a hailtable with a row for every transcript included in the no_rmc set
    #   the browser needs to be able to distinguish between transcripts that were
    #   searched and had no RMC evidence, vs those that were not searched, for display
    #   purposes
    no_rmc_set = ds.globals.transcripts_no_rmc
    no_rmc_list = list(no_rmc_set.collect()[0])
    ds_no_rmc = hl.utils.range_table(1)
    ds_no_rmc = ds_no_rmc.annotate(
        transcript_id=(hl.array(no_rmc_list)),
        has_no_rmc_evidence=hl.bool(True),
        passed_qc=hl.bool(False),
        regions=hl.empty_array(
            hl.tstruct(
                chrom=hl.tstr,
                start=hl.tint32,
                stop=hl.tint32,
                aa_start=hl.tstr,
                aa_stop=hl.tstr,
                obs_mis=hl.tint64,
                exp_mis=hl.tfloat64,
                obs_exp=hl.tfloat64,
                chisq_diff_null=hl.tfloat64,
                p_value=hl.tfloat64,
            )
        ),
    )
    ds_no_rmc = ds_no_rmc.explode(ds_no_rmc["transcript_id"])
    ds_no_rmc = ds_no_rmc.key_by("transcript_id")
    ds_no_rmc = ds_no_rmc.drop("idx")

    # combine the hail table of those transcripts with evidence, and those transcripts
    #   searched without evidence
    ds_all_searched = ds_with_rmc.union(ds_no_rmc)

    # Don't need the information in globals for the browser
    ds_all_searched = ds_all_searched.select_globals()

    return ds_all_searched

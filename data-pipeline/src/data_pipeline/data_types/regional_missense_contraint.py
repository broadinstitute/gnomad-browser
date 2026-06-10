import hail as hl


def prepare_gnomad_regional_missense_constraint(path, version):
    ht_rmc = hl.read_table(path)

    # rename key field transcript_id to transcript to allow merging in genes pipeline
    ht_transcripts_with_rmc = ht_rmc.transmute(transcript_id=ht_rmc.transcript)
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.key_by("transcript_id")
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.drop("transcript")

    # explode then collect to rename fields for consistency with ExAC RMC
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.explode("regions")

    # shared fields for v2 and v4 RMC
    region_fields = {
        "chrom": ht_transcripts_with_rmc.regions.start_coordinate.contig,
        "start": hl.min(
            ht_transcripts_with_rmc.regions.start_coordinate.position,
            ht_transcripts_with_rmc.regions.stop_coordinate.position,
        ),
        "stop": hl.max(
            ht_transcripts_with_rmc.regions.start_coordinate.position,
            ht_transcripts_with_rmc.regions.stop_coordinate.position,
        ),
        "aa_start": ht_transcripts_with_rmc.regions.start_aa,
        "aa_stop": ht_transcripts_with_rmc.regions.stop_aa,
        "obs_mis": ht_transcripts_with_rmc.regions.obs,
        "exp_mis": ht_transcripts_with_rmc.regions.exp,
        "obs_exp": ht_transcripts_with_rmc.regions.oe,
        "chisq_diff_null": ht_transcripts_with_rmc.regions.chisq,
        "p_value": ht_transcripts_with_rmc.regions.p,
    }

    if version == "v4":
        # v4 file has these additional fields
        region_fields.update(
            {
                "low_coverage": ht_transcripts_with_rmc.regions.low_coverage,
                "percentile": ht_transcripts_with_rmc.regions.percentile,
                "no_color": ht_transcripts_with_rmc.regions.no_color,
            }
        )

    ht_transcripts_with_rmc = ht_transcripts_with_rmc.select(regions=hl.struct(**region_fields))

    ht_transcripts_with_rmc = ht_transcripts_with_rmc.group_by("transcript_id").aggregate(
        regions=hl.agg.collect(ht_transcripts_with_rmc.row_value).regions
    )

    ht_transcripts_with_rmc = ht_transcripts_with_rmc.group_by("transcript_id").aggregate(
        regions_array=hl.agg.collect(ht_transcripts_with_rmc.row_value)
    )
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.annotate(has_no_rmc_evidence=hl.bool(False))
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.annotate(passed_qc=hl.bool(True))
    ht_transcripts_with_rmc = ht_transcripts_with_rmc.select(
        has_no_rmc_evidence=ht_transcripts_with_rmc.has_no_rmc_evidence,
        passed_qc=ht_transcripts_with_rmc.passed_qc,
        regions=hl.sorted(ht_transcripts_with_rmc.regions_array[0].regions, lambda region: region.start),
    )

    # create a hailtable with a row for every transcript included in the no_rmc set
    #   the browser needs to be able to distinguish between transcripts that were
    #   searched and had no RMC evidence, vs those that were not searched, for display
    #   purposes
    no_rmc_set = ht_rmc.globals.transcripts_no_rmc
    no_rmc_list = list(no_rmc_set.collect()[0])
    ht_transcripts_not_searched = hl.utils.range_table(1)

    ht_transcripts_region_array_type = ht_transcripts_with_rmc.regions.dtype.element_type

    ht_transcripts_not_searched = ht_transcripts_not_searched.annotate(
        transcript_id=(hl.array(no_rmc_list)),
        has_no_rmc_evidence=hl.bool(True),
        passed_qc=hl.bool(False),
        regions=hl.empty_array(ht_transcripts_region_array_type),
    )

    ht_transcripts_not_searched = ht_transcripts_not_searched.explode(ht_transcripts_not_searched["transcript_id"])
    ht_transcripts_not_searched = ht_transcripts_not_searched.key_by("transcript_id")
    ht_transcripts_not_searched = ht_transcripts_not_searched.drop("idx")

    # combine the hail table of those transcripts with evidence, and those transcripts
    #   searched without evidence
    ht_all_rmc_transcripts = ht_transcripts_with_rmc.union(ht_transcripts_not_searched)

    # Don't need the information in globals for the browser
    ht_all_rmc_transcripts = ht_all_rmc_transcripts.select_globals()

    return ht_all_rmc_transcripts

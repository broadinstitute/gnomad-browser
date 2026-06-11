import hail as hl


def prepare_gnomad_regional_missense_constraint(path, version):
    valid_versions = ["v2", "v4"]
    if version not in valid_versions:
        raise ValueError(f"Version must be one of {valid_versions}")

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
        # passed_qc=ht_transcripts_with_rmc.passed_qc,
        regions=hl.sorted(ht_transcripts_with_rmc.regions_array[0].regions, lambda region: region.start),
    )

    # create a hailtable with a row for every transcript included in the no_rmc set
    #   the browser needs to be able to distinguish between transcripts that were
    #   searched and had no RMC evidence, vs those that were not searched, for display
    #   purposes
    no_rmc_set = None
    if version == "v4":
        no_rmc_set = ht_rmc.globals.all_transcripts.transcripts_no_rmc
    else:
        no_rmc_set = ht_rmc.globals.transcripts_no_rmc

    no_rmc_list = list(no_rmc_set.collect()[0])
    ht_transcripts_not_searched = hl.utils.range_table(1)

    ht_transcripts_region_array_type = ht_transcripts_with_rmc.regions.dtype.element_type

    ht_transcripts_not_searched = ht_transcripts_not_searched.annotate(
        transcript_id=(hl.array(no_rmc_list)),
        has_no_rmc_evidence=hl.bool(True),
        regions=hl.empty_array(ht_transcripts_region_array_type),
    )

    ht_transcripts_not_searched = ht_transcripts_not_searched.explode(ht_transcripts_not_searched["transcript_id"])
    ht_transcripts_not_searched = ht_transcripts_not_searched.key_by("transcript_id")
    ht_transcripts_not_searched = ht_transcripts_not_searched.drop("idx")

    # combine the hail table of those transcripts with evidence, and those transcripts
    #   searched without evidence
    ht_rmc_all_transcripts_searched = ht_transcripts_with_rmc.union(ht_transcripts_not_searched)

    ht_rmc_all_transcripts_searched = ht_rmc_all_transcripts_searched.annotate(
        is_outlier=False,
        is_outlier_no_display=False,
    )

    if version == "v4":

        # get outlier transcript hail table
        outlier_set = ht_rmc.globals.all_transcripts.all_outlier_transcripts
        outlier_list = list(outlier_set.collect()[0])
        ht_outlier_transcripts = hl.utils.range_table(1)
        ht_outlier_transcripts = ht_outlier_transcripts.annotate(
            transcript_id=(hl.array(outlier_list)),
            is_outlier=True,
        )
        ht_outlier_transcripts = ht_outlier_transcripts.explode(ht_outlier_transcripts["transcript_id"])
        ht_outlier_transcripts = ht_outlier_transcripts.key_by("transcript_id")
        ht_outlier_transcripts = ht_outlier_transcripts.drop("idx")

        # get outlier no display transcript hail table
        no_display_outlier_set = ht_rmc.globals.all_transcripts.no_exp_outlier_transcripts
        no_display_outlier_list = list(no_display_outlier_set.collect()[0])
        ht_no_display_outlier_transcripts = hl.utils.range_table(1)
        ht_no_display_outlier_transcripts = ht_no_display_outlier_transcripts.annotate(
            transcript_id=(hl.array(no_display_outlier_list)),
            is_outlier_no_display=True,
        )
        ht_no_display_outlier_transcripts = ht_no_display_outlier_transcripts.explode(
            ht_no_display_outlier_transcripts["transcript_id"]
        )
        ht_no_display_outlier_transcripts = ht_no_display_outlier_transcripts.key_by("transcript_id")
        ht_no_display_outlier_transcripts = ht_no_display_outlier_transcripts.drop("idx")

        ht_rmc_all_transcripts_searched = ht_rmc_all_transcripts_searched.annotate(
            is_outlier=hl.if_else(
                hl.is_defined(ht_outlier_transcripts[ht_rmc_all_transcripts_searched.transcript_id]), True, False
            ),
            is_outlier_no_display=hl.if_else(
                hl.is_defined(ht_no_display_outlier_transcripts[ht_rmc_all_transcripts_searched.transcript_id]),
                True,
                False,
            ),
        )
    else:
        ht_rmc_all_transcripts_searched = ht_rmc_all_transcripts_searched.annotate(
            is_outlier=False,
            is_outlier_no_display=False,
        )

    ht_rmc_all_transcripts_searched = ht_rmc_all_transcripts_searched.select_globals()

    return ht_rmc_all_transcripts_searched

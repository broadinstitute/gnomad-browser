import hail as hl


# TODO: temp, just for v2 track to show with v4
#  need to:
#  - liftover regions
#  - key by gene_id instead of transcript for a better join
def prepare_gnomad_regional_missense_constraint_liftover(path):
    ds = hl.read_table(path)

    # rename key field transcript_id to transcript to allow merging in genes pipeline
    ds_with_rmc = ds.transmute(transcript_id=ds.transcript)
    ds_with_rmc = ds_with_rmc.key_by("transcript_id")
    ds_with_rmc = ds_with_rmc.drop("transcript")

    # explode then collect to rename fields for consistency with ExAC RMC
    ds_with_rmc = ds_with_rmc.explode("regions")
    ds_with_rmc = ds_with_rmc.select(
        regions=hl.struct(
            start_locus=ds_with_rmc.regions.start_coordinate,
            stop_locus=ds_with_rmc.regions.stop_coordinate,
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

    # ---
    # liftover coordinates
    # ---

    # print("running liftover!")
    rg37 = hl.get_reference("GRCh37")
    rg38 = hl.get_reference("GRCh38")

    if not rg37.has_liftover(rg38):
        chain_file_path = "gs://hail-common/references/grch37_to_grch38.over.chain.gz"
        rg37.add_liftover(chain_file_path, rg38)

    ds_with_rmc = ds_with_rmc.select(
        regions=hl.struct(
            start_locus_grch38=hl.liftover(ds_with_rmc.regions.start_locus, "GRCh38"),
            stop_locus_grch38=hl.liftover(ds_with_rmc.regions.stop_locus, "GRCh38"),
            chrom_grch37=ds_with_rmc.regions.chrom,
            start_grch37=ds_with_rmc.regions.start,
            stop_grch37=ds_with_rmc.regions.stop,
            aa_start=ds_with_rmc.regions.aa_start,
            aa_stop=ds_with_rmc.regions.aa_stop,
            obs_mis=ds_with_rmc.regions.obs_mis,
            exp_mis=ds_with_rmc.regions.exp_mis,
            obs_exp=ds_with_rmc.regions.obs_exp,
            chisq_diff_null=ds_with_rmc.regions.chisq_diff_null,
            p_value=ds_with_rmc.regions.p_value,
        ),
    )
    ds_with_rmc = ds_with_rmc.select(
        regions=hl.struct(
            chrom=ds_with_rmc.regions.start_locus_grch38.contig,
            start=hl.min(
                ds_with_rmc.regions.start_locus_grch38.position, ds_with_rmc.regions.stop_locus_grch38.position
            ),
            stop=hl.max(
                ds_with_rmc.regions.start_locus_grch38.position, ds_with_rmc.regions.stop_locus_grch38.position
            ),
            chrom_grch37=ds_with_rmc.regions.chrom_grch37,
            start_grch37=ds_with_rmc.regions.start_grch37,
            stop_grch37=ds_with_rmc.regions.stop_grch37,
            aa_start=ds_with_rmc.regions.aa_start,
            aa_stop=ds_with_rmc.regions.aa_stop,
            obs_mis=ds_with_rmc.regions.obs_mis,
            exp_mis=ds_with_rmc.regions.exp_mis,
            obs_exp=ds_with_rmc.regions.obs_exp,
            chisq_diff_null=ds_with_rmc.regions.chisq_diff_null,
            p_value=ds_with_rmc.regions.p_value,
        ),
    )

    # ---
    # Key by gene_id instead of transcript_id
    # ---
    gene_grch37_annotated_3_path = (
        "gs://gnomad-v4-data-pipeline/2025-06-30_rhg/output/genes/genes_grch37_annotated_3.ht"
    )
    gene_grch37_annotated_3_ht = hl.read_table(gene_grch37_annotated_3_path)
    gene_grch37_annotated_3_ht = gene_grch37_annotated_3_ht.select(
        transcript_id=gene_grch37_annotated_3_ht.preferred_transcript_id,
    )
    transcript_gene_join_ht = gene_grch37_annotated_3_ht.key_by("transcript_id")

    # join the two
    ds_with_rmc = ds_with_rmc.annotate(**transcript_gene_join_ht[ds_with_rmc.transcript_id])

    print("Just joined with the table!")
    print(ds_with_rmc.describe())

    ds_with_rmc = ds_with_rmc.key_by("gene_id")
    ds_with_rmc = ds_with_rmc.drop("transcript_id")

    # ds_with_rmc = ds_with_rmc.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds_with_rmc.row_value).regions)
    ds_with_rmc = ds_with_rmc.group_by("gene_id").aggregate(regions=hl.agg.collect(ds_with_rmc.row_value).regions)

    # ds_with_rmc = ds_with_rmc.group_by("transcript_id").aggregate(regions_array=hl.agg.collect(ds_with_rmc.row_value))
    ds_with_rmc = ds_with_rmc.group_by("gene_id").aggregate(regions_array=hl.agg.collect(ds_with_rmc.row_value))
    ds_with_rmc = ds_with_rmc.annotate(has_no_rmc_evidence=hl.bool(False))
    ds_with_rmc = ds_with_rmc.annotate(passed_qc=hl.bool(True))
    ds_with_rmc = ds_with_rmc.select(
        has_no_rmc_evidence=ds_with_rmc.has_no_rmc_evidence,
        passed_qc=ds_with_rmc.passed_qc,
        regions=hl.sorted(ds_with_rmc.regions_array[0].regions, lambda region: region.start),
    )

    print("Munging things to turn transcript list into gene list ...")
    # create a hailtable with a row for every transcript included in the no_rmc set
    #   the browser needs to be able to distinguish between transcripts that were
    #   searched and had no RMC evidence, vs those that were not searched, for display
    #   purposes
    no_rmc_set = ds.globals.transcripts_no_rmc
    no_rmc_list = list(no_rmc_set.collect()[0])
    print(f"transcript list created, count is {len(no_rmc_list)}")

    no_rmc_transcripts_ht = hl.Table.parallelize(
        [{"transcript_id": t} for t in no_rmc_list], hl.tstruct(transcript_id=hl.tstr), key="transcript_id"
    )

    print("Just made no_transcripts table, showing some things:")
    no_rmc_transcripts_ht.describe()
    no_rmc_transcripts_ht.show(5)

    no_rmc_transcripts_ht = no_rmc_transcripts_ht.annotate(
        **transcript_gene_join_ht[no_rmc_transcripts_ht.transcript_id]
    )

    print("Just joined no_transcripts table, showing some things:")
    no_rmc_transcripts_ht.describe()
    no_rmc_transcripts_ht.show(5)

    no_rmc_set_by_gene_id = no_rmc_transcripts_ht.aggregate(hl.agg.collect_as_set(no_rmc_transcripts_ht.gene_id))
    no_rmc_list_by_gene_id = list(no_rmc_set_by_gene_id)

    print(f"gene_id set created, count is {len(no_rmc_list_by_gene_id)}")

    ds_no_rmc = hl.utils.range_table(1)
    ds_no_rmc = ds_no_rmc.annotate(
        # transcript_id=(hl.array(no_rmc_list)),
        gene_id=(hl.array(no_rmc_list_by_gene_id)),
        has_no_rmc_evidence=hl.bool(True),
        passed_qc=hl.bool(False),
        regions=hl.empty_array(
            hl.tstruct(
                chrom=hl.tstr,
                start=hl.tint32,
                stop=hl.tint32,
                chrom_grch37=hl.tstr,
                start_grch37=hl.tint32,
                stop_grch37=hl.tint32,
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

    ds_no_rmc = ds_no_rmc.explode(ds_no_rmc["gene_id"])
    ds_no_rmc = ds_no_rmc.key_by("gene_id")
    ds_no_rmc = ds_no_rmc.drop("idx")

    # combine the hail table of those transcripts with evidence, and those transcripts
    #   searched without evidence
    ds_all_searched = ds_with_rmc.union(ds_no_rmc)

    # Don't need the information in globals for the browser
    ds_all_searched = ds_all_searched.select_globals()

    print("Final struct:")
    print(ds_all_searched.describe())
    print(ds_all_searched.show(5))

    return ds_all_searched


def prepare_gnomad_regional_missense_constraint(path, liftover=False):
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

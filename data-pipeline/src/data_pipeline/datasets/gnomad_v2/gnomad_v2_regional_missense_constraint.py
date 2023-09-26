import hail as hl


def prepare_gnomad_v2_regional_missense_constraint(path, annotation_name=""):
    ds = hl.read_table(path)

    ds_with_rmc = ds.transmute(transcript_id=ds.transcript)
    ds_with_rmc = ds_with_rmc.key_by("transcript_id")
    ds_with_rmc = ds_with_rmc.drop("transcript")
    ds_with_rmc = ds_with_rmc.group_by("transcript_id").aggregate(regions_array=hl.agg.collect(ds_with_rmc.row_value))

    ds_with_rmc = ds_with_rmc.annotate(has_no_rmc_evidence=hl.bool(False))

    ds_with_rmc = ds_with_rmc.annotate(
        passed_qc=hl.if_else(
            hl.set(ds_with_rmc.globals.rmc_transcripts_qc).contains(ds_with_rmc.transcript_id),
            hl.bool(True),
            hl.bool(False),
        )
    )

    ds_with_rmc = ds_with_rmc.select(
        has_no_rmc_evidence=ds_with_rmc.has_no_rmc_evidence,
        passed_qc=ds_with_rmc.passed_qc,
        regions=ds_with_rmc.regions_array[0].regions,
    )

    # TODO: should this be all, or qc?
    no_rmc_set = ds.globals.transcripts_no_rmc_all
    no_rmc_list = list(no_rmc_set.collect()[0])

    ds_no_rmc = hl.utils.range_table(1)
    ds_no_rmc = ds_no_rmc.annotate(
        transcript_id=(hl.array(no_rmc_list)),
        has_no_rmc_evidence=hl.bool(True),
        passed_qc=hl.bool(False),
        regions=(
            hl.array(
                hl.literal(
                    [
                        hl.struct(
                            # is there a better way to make a typed but empty struct?
                            start_coordinate=hl.locus("1", 1234567),
                            stop_coordinate=hl.locus("1", 2345678),
                            start_aa="",
                            stop_aa="",
                            obs=hl.int64(1),
                            exp=1.1,
                            oe=1.1,
                            chisq=1.1,
                            p=1.1,
                        )
                    ]
                )
            )
        ),
    )
    ds_no_rmc = ds_no_rmc.explode(ds_no_rmc["transcript_id"])
    ds_no_rmc = ds_no_rmc.key_by("transcript_id")
    ds_no_rmc = ds_no_rmc.drop("idx")

    ds_all_searched = ds_with_rmc.union(ds_no_rmc)
    # print("\n\n\n\ncombined???")
    # print(ds_all_searched.describe())
    # print(f"\n\n# is: {ds_3.count()}\n\n") # count returned 18629!!!!

    if annotation_name != "":
        ds_all_searched = ds_all_searched.rename({"regions": annotation_name})

    return ds_all_searched


# annotated_path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# ht = hl.read_table(annotated_path)
# print(ht.describe())
# print(ht.show(3))


# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230911_rmc_demo"
# ds = prepare_gnomad_v2_regional_missense_constraint(gs_path, "TEST NAME")
# print("\n\ndescribe\n\n")
# print(ds.describe())
# # print("\n\nshow\n\n")
# # print(ds.show(5))
# print("\n\ncount\n\n")
# print(f"\n\n{ds.count()}\n\n")
# print("\n\ncount\n\n")

# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230911_rmc_demo"
# ds = hl.read_table(gs_path)
# print(ds.count())


# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230911_rmc_demo"
# ds = hl.read_table(gs_path)
# print(ds.describe())
gs_path_2 = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230926_rmc_demo"
ds = hl.read_table(gs_path_2)
print(ds.describe())
# ht = prepare_gnomad_v2_regional_missense_constraint(gs_path_2)
# print(ht.describe())
all_transcripts = ds.globals.all_canonical_transcripts
all_searched = ds.globals.transcripts_searched
not_searched = all_transcripts.difference(all_searched)
not_search_list = list(not_searched.collect()[0])
print(hl.eval(all_transcripts.size()))
print(hl.eval(all_searched.size()))
print(hl.eval(not_searched.size()))
print(len(not_search_list))

print(not_search_list[0])
print(not_search_list[1])
print(not_search_list[2])
print(not_search_list[3])
print(not_search_list[4])
print(not_search_list[5])
print(not_search_list[6])
print(not_search_list[7])

print(ds.count())


# ds_filtered = ds.filter(ds.transcript in )


# # ANKRD11: ENST00000301030
# transcript = "ENST00000301030"

# rmc_transcripts_qc_set = ds.globals.rmc_transcripts_qc
# rmc_transcripts_qc_list = list(rmc_transcripts_qc_set.collect()[0])
# print(len(rmc_transcripts_qc_list))
# # print(rmc_transcripts_qc_list[0])
# print( transcript in rmc_transcripts_qc_list)


# rmc_transcripts_all_set = ds.globals.rmc_transcripts_all
# rmc_transcripts_all_list = list(rmc_transcripts_all_set.collect()[0])
# print(len(rmc_transcripts_all_list))
# print( transcript in rmc_transcripts_all_list)

# check PCSK9: ENST00000302118

# all_canonical_set = ds.globals.
# ds = prepare_gnomad_v2_regional_missense_constraint(gs_path, "test name yo!")
# print(ds.describe())
# print(ds.show(5))


# annotated_path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# ds_annotated = hl.read_table(annotated_path)
# print(ds_annotated.describe())
# print(f"\ncount is: {ds_annotated.count()}\n")


# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230731_rmc_demo_copy"
# ds = prepare_gnomad_v2_regional_missense_constraint(gs_path, "test name yo!")
# print(ds.describe())
# print(ds.show(5))

# ds_filtered = ds.filter(ds.transcript_id=="ENST00000366963")
# print(ds_filtered.show(1))


# print(ds.show(5))


# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230627_rmc_demo/demo_release.ht"
# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230731_rmc_demo"
# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230731_rmc_demo_copy"
# ds = hl.read_table(gs_path)
# print(ds.describe())
# print(f"\ncount is: {ds.count()}\n")


# annotated_path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# ds_annotated = hl.read_table(annotated_path)
# print(ds_annotated.describe())
# print(f"\ncount is: {ds_annotated.count()}\n")


# as_list = ds.globals.transcripts_not_searched.collect()
# transcript_not_searched_set = ds.globals.transcripts_not_searched.collect()[0]
# print(ds.transcripts_not_searched)
# print(as_list[0])
# print(type(as_list[0]))

# print(f"\n# transcripts not searched is: {len(as_list[0])}\n")
# print(f"\nIs element ENST00000366963 in the set? {'ENST00000366963' in as_list[0]}\n")


# transcript_no_rmc_set = ds.globals.transcripts_no_rmc.collect()[0]
# print(f"\n# transcripts no RMC is: {len(transcript_no_rmc_set)}\n")
# print(f"\nIs element ENST00000366963 in the set? {'ENST00000366963' in transcript_no_rmc_set}\n")


# ds_filtered = ds.filter(ds.transcript=="ENST00000505820")
# ds_filtered = ds.filter(ds.transcript=="ENST00000312165")
# ds_filtered = ds.filter(ds.transcript=="ENST00000366963")

# print("\n\n")
# print(ds_filtered.count())
# print(ds_filtered.show(1))


# gs_path = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230627_rmc_demo/demo_release.ht"
# # local_path = "/Users/rgrant/Downloads/kc_data/demo_release.ht"
# ds = hl.read_table(gs_path)
# print(ds.describe())


# print("\n\n\nannotated 4")
# path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# ds = hl.read_table(path)
# print(ds.describe())
# ds_2 = ds.filter(ds.gene_id=="ENSG00000197530")
# print(ds_2.show(1))


# gs_kc_1 = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230724_rmc_demo"
# gs_kc_2 = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230726_rmc_demo_alt_missing_aa"

# ds_kc_1 = hl.read_table(gs_kc_1)
# print(ds_kc_1.describe())
# ds_kc_1_filtered = ds_kc_1.filter(ds_kc_1.transcript=="ENST00000505820")
# print("\n\n")
# print(ds_kc_1_filtered.count())
# print(ds_kc_1_filtered.show(1))


# print("\n\n PART 2")

# ds_kc_2 = hl.read_table(gs_kc_2)
# print(ds_kc_2.describe())
# ds_kc_2_filtered = ds_kc_2.filter(ds_kc_2.transcript=="ENST00000505820")
# print("\n\n")
# print(ds_kc_2_filtered.count())
# print(ds_kc_2_filtered.show(1))

# ds_kc_1_filtered.show(5)

# print("\n\n\n")
# print(ds.show(5))

# print("\n\n\nannotated 4")
# # path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# local_path = "/Users/rgrant/Downloads/kc_data/demo_release.ht"
# ds = hl.read_table(local_path)
# print(ds.describe())
# print(ds.count())
# ds_2 = prepare_gnomad_v2_regional_missense_constraint(local_path, "test")
# print(ds_2.describe())
# print(ds_2.count())


# def prepare_gnomad_v2_regional_missense_constraint(path, annotation_name=""):

#     ds = hl.read_table(path)

#     # print(ds.describe())

#     ds = ds.transmute(transcript_id=ds.transcript)
#     ds = ds.key_by('transcript_id')
#     ds = ds.drop('transcript')


#     # ds = ds.group_by("transcript")

#     # print(f"===\n\n\n\n\n")

#     # print(ds.describe())

#     # print(f"===\n\n\n\n\n")

#     ds = ds.group_by("transcript_id").aggregate(regions_array=hl.agg.collect(ds.row_value))
#     ds = ds.select(gnomad_v2_regional_missense_constraint_regions_array=ds.regions_array)

#     # print(ds.describe())
#     # print(ds.show(5))

#     return ds

# ds = ds.explode('regions')
# ds = ds.transmute(region=ds.regions, transcript_id=ds.transcript)
# ds = ds.key_by('transcript_id')
# ds = ds.drop('transcript')

# ds = ds.annotate(
#     start=hl.min(ds.region.start_coordinate.position, ds.region.stop_coordinate.position),
#     stop=hl.max(ds.region.start_coordinate.position, ds.region.stop_coordinate.position),
#     chrom=ds.region.start_coordinate.contig,
#     start_aa=ds.region.start_aa,
#     stop_aa=ds.region.stop_aa,
#     obs_exp=ds.region.oe,
#     chisq_diff_null=ds.region.chisq,
# )

# ds = ds.drop('region')


# ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))
# ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))
# ds = ds.select(gnomad_v2_regional_missense_constraint_regions=ds.regions)

# if annotation_name != "":
#     ds = ds.rename({"gnomad_v2_regional_missense_constraint_regions": annotation_name})

# # print(ds.describe())
# # print(ds.count())
# # print(ds.show(2))

# return ds

# ds = ds.transmute(
#     obs_mis=ds.section_obs, exp_mis=ds.section_exp, obs_exp=ds.section_oe, chisq_diff_null=ds.section_chisq
# )

# ds = ds.transmute(transcript_id=ds.transcript.split("\\.")[0])

# ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))

# ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))

# ds = ds.select(gnomad_v2_regional_missense_constraint_regions=ds.regions)
# if annotation_name != "":
#     ds = ds.rename({"gnomad_v2_regional_missense_constraint_regions": annotation_name})

# return ds


# path_rmc_demo = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230627_rmc_demo/demo_release.ht"
# # ds = hl.read_table(path_rmc_demo)

# print(f"testing!\n")
# # print(ds.describe())
# ds = prepare_gnomad_v2_regional_missense_constraint(path_rmc_demo)

# ds = prepare_gnomad_v2_regional_missense_constraint(path_rmc_demo)
# print(ds.describe())
# ds.show(5)


# path_rmc_demo = "gs://gnomad-rgrant-data-pipeline/output/constraint/20230622_rmc_demo/demo_release.ht"
# print(f"testing!\n")
# ds = prepare_gnomad_v2_regional_missense_constraint(path_rmc_demo)
# print(ds.describe())
# ds.show(5)

# path_0_01 =    "gs://gnomad-rgrant-data-pipeline/output/constraint/rmc_0_01/all_rmc.ht"
# path_0_0001 =  "gs://gnomad-rgrant-data-pipeline/output/constraint/rmc_0_0001/all_rmc.ht"
# path_0_00001 = "gs://gnomad-rgrant-data-pipeline/output/constraint/rmc_0_00001/all_rmc.ht"

# print(f"testing!\n")
# ds = prepare_gnomad_v2_regional_missense_constraint(path_0_01)
# ds = prepare_gnomad_v2_regional_missense_constraint(path_0_01, "gnomad_v2_regional_missense_constraint_regions_0_01")
# print(ds.describe())
# ds.show(5)

# print("\n\n\nannotated 4")
# path = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grch37_annotated_4.ht"
# ds = hl.read_table(path)
# print(ds.describe())

# print("\n\n\nannotated 5")
# path2 = "gs://gnomad-rgrant-data-pipeline/output/genes/genes_grchy37_annotated_5.ht"
# ds = hl.read_table(path2)
# print(ds.describe())


# path =  "gs://gnomad-rgrant-data-pipeline/output/constraint/rmc_0_0001/all_rmc.ht"
# ds = hl.read_table(path)
# print("\n===\nRaw table describe:")
# print(ds.describe())
# print(ds.count())

# dsUnique = ds.key_by("transcript").distinct()
# rawUnique = dsUnique.count()
# print(f"\n\nUnique # of transcript_id's in Raw is: {rawUnique}")

# if rawUnique == 6,388 I am in business, and then I need to find a way to determine what
#   is not included in the table

# print("\n-----\n")

# ds2 = prepare_gnomad_v2_regional_missense_constraint(path)
# print("\n===\nProcessed table describe:")
# print(ds2.describe())
# # print(ds2.head(5).show(5))
# # COUNT IS: 6,388
# # print(ds2.count())

# ds2Unique = ds.select("transcript_id").distinct()
# processedUnique = ds2Unique.count()
# print


# print("\n-----\n")

# this format should have been OK, no PCSK9?
# ds2filt = ds2.filter(ds2.transcript_id == 'ENST00000302118')
# print("\n===\nFiltered processed table describe:")
# print(ds2filt.describe())
# print(ds2filt.count())

import hail as hl


def prepare_gnomad_v2_regional_missense_constraint(path, annotation_name=""):

    ds = hl.read_table(path)

    # TODO: remove this line when this annotation is removed in final dataset
    # ds = ds.drop("search_type")

    ds = ds.annotate(
        start=hl.min(ds.interval.start.position, ds.interval.end.position),
        stop=hl.max(ds.interval.start.position, ds.interval.end.position),
    )

    ds = ds.transmute(
        obs_mis=ds.section_obs, exp_mis=ds.section_exp, obs_exp=ds.section_oe, chisq_diff_null=ds.section_chisq
    )

    ds = ds.transmute(transcript_id=ds.transcript.split("\\.")[0])

    ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))

    ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))

    ds = ds.select(gnomad_v2_regional_missense_constraint_regions=ds.regions)
    if annotation_name != "":
        ds = ds.rename({"gnomad_v2_regional_missense_constraint_regions": annotation_name})

    return ds


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


path =  "gs://gnomad-rgrant-data-pipeline/output/constraint/rmc_0_0001/all_rmc.ht"
ds = hl.read_table(path)
print("\n===\nRaw table describe:")
print(ds.describe())
print(ds.count())

dsUnique = ds.key_by("transcript").distinct()
rawUnique = dsUnique.count()
print(f"\n\nUnique # of transcript_id's in Raw is: {rawUnique}")

# if rawUnique == 6,388 I am in business, and then I need to find a way to determine what
#   is not included in the table

print("\n-----\n")

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

import hail as hl

from data_pipeline.data_types.locus import normalized_contig, x_position
from data_pipeline.data_types.variant import variant_id, variant_ids


def nullify_nan(value):
    return hl.if_else(hl.is_nan(value), hl.null(value.dtype), value)


POPULATIONS = [
    "afr",
    "ami",
    "amr",
    "asj",
    "eas",
    "fin",
    "nfe",
    "oth",
    "sas",
]


def population_frequencies_expression(ds, freq_index_dict):
    populations = []

    for pop_id in POPULATIONS:
        populations.append(
            hl.struct(
                id=pop_id.upper(),
                ac=ds.freq[freq_index_dict[f"adj_{pop_id}"]].AC,
                an=ds.freq[freq_index_dict[f"adj_{pop_id}"]].AN,
                hemizygote_count=hl.if_else(ds.nonpar, ds.freq[freq_index_dict[f"adj_{pop_id}_male"]].AN, 0),
                homozygote_count=ds.freq[freq_index_dict[f"adj_{pop_id}"]].homozygote_count,
            )
        )

        populations.append(
            hl.struct(
                id=f"{pop_id.upper()}_FEMALE",
                ac=ds.freq[freq_index_dict[f"adj_{pop_id}_female"]].AC,
                an=ds.freq[freq_index_dict[f"adj_{pop_id}_female"]].AN,
                hemizygote_count=0,
                homozygote_count=ds.freq[freq_index_dict[f"adj_{pop_id}_female"]].homozygote_count,
            )
        )

        populations.append(
            hl.struct(
                id=f"{pop_id.upper()}_MALE",
                ac=ds.freq[freq_index_dict[f"adj_{pop_id}_male"]].AC,
                an=ds.freq[freq_index_dict[f"adj_{pop_id}_male"]].AN,
                hemizygote_count=hl.if_else(ds.nonpar, ds.freq[freq_index_dict[f"adj_{pop_id}_male"]].AC, 0),
                homozygote_count=ds.freq[freq_index_dict[f"adj_{pop_id}_male"]].homozygote_count,
            )
        )

    populations.append(
        hl.struct(
            id="FEMALE",
            ac=ds.freq[freq_index_dict["adj_female"]].AC,
            an=ds.freq[freq_index_dict["adj_female"]].AN,
            hemizygote_count=0,
            homozygote_count=ds.freq[freq_index_dict["adj_female"]].homozygote_count,
        )
    )

    populations.append(
        hl.struct(
            id="MALE",
            ac=ds.freq[freq_index_dict["adj_male"]].AC,
            an=ds.freq[freq_index_dict["adj_male"]].AN,
            hemizygote_count=hl.if_else(ds.nonpar, ds.freq[freq_index_dict["adj_male"]].AC, 0),
            homozygote_count=ds.freq[freq_index_dict["adj_male"]].homozygote_count,
        )
    )

    return populations


def prepare_gnomad_v3_variants(path):
    ds = hl.read_table(path)

    g = hl.eval(ds.globals)

    ############################
    # Derived top level fields #
    ############################

    ds = ds.annotate(
        variant_id=variant_id(ds.locus, ds.alleles),
        reference_genome="GRCh38",
        chrom=normalized_contig(ds.locus.contig),
        pos=ds.locus.position,
        xpos=x_position(ds.locus),
        ref=ds.alleles[0],
        alt=ds.alleles[1],
    )

    ds = ds.annotate(
        colocated_variants=variant_ids(ds.old_locus, ds.old_alleles).filter(lambda vid: vid != ds.variant_id)
    )

    ###############
    # Frequencies #
    ###############

    ds = ds.annotate(nonpar=ds.info.non_par)

    ds = ds.annotate(
        genome=hl.struct(
            ac=ds.freq[g.freq_index_dict["adj"]].AC,
            ac_raw=ds.freq[g.freq_index_dict["raw"]].AC,
            an=ds.freq[g.freq_index_dict["adj"]].AN,
            hemizygote_count=hl.if_else(ds.nonpar, ds.freq[g.freq_index_dict["adj_male"]].AC, 0),
            homozygote_count=ds.freq[g.freq_index_dict["adj"]].homozygote_count,
            populations=population_frequencies_expression(ds, g.freq_index_dict),
        )
    )

    ds = ds.drop("freq")

    ##############################
    # Filtering allele frequency #
    ##############################

    ds = ds.annotate(
        genome=ds.genome.annotate(
            faf95=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"adj_{pop_id}"]].faf95, population=pop_id.upper(),)
                            for pop_id in ["afr", "amr", "eas", "nfe", "sas"]
                        ]
                    ),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(popmax=fafs[0].faf, popmax_population=fafs[0].population,),
                    hl.struct(popmax=hl.null(hl.tfloat), popmax_population=hl.null(hl.tstr),),
                ),
            ),
            faf99=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"adj_{pop_id}"]].faf99, population=pop_id.upper(),)
                            for pop_id in ["afr", "amr", "eas", "nfe", "sas"]
                        ]
                    ),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(popmax=fafs[0].faf, popmax_population=fafs[0].population,),
                    hl.struct(popmax=hl.null(hl.tfloat), popmax_population=hl.null(hl.tstr),),
                ),
            ),
        )
    )

    ds = ds.drop("faf")

    ###################
    # Quality metrics #
    ###################

    ds = ds.annotate(lcr=ds.info.lcr)

    ds = ds.annotate(
        genome=ds.genome.annotate(
            filters=ds.filters,
            quality_metrics=hl.struct(
                allele_balance=hl.struct(alt=ds.ab_hist_alt),
                genotype_depth=hl.struct(all=ds.dp_hist_all, alt=ds.dp_hist_alt),
                genotype_quality=hl.struct(all=ds.gq_hist_all, alt=ds.gq_hist_alt),
                site_quality_metrics=[
                    hl.struct(metric="FS", value=hl.float(nullify_nan(ds.info.FS))),
                    hl.struct(metric="InbreedingCoeff", value=hl.float(nullify_nan(ds.info.InbreedingCoeff))),
                    hl.struct(metric="MQ", value=hl.float(nullify_nan(ds.info.MQ))),
                    hl.struct(metric="MQRankSum", value=hl.float(ds.info.MQRankSum)),
                    hl.struct(metric="QD", value=hl.float(ds.info.QD)),
                    hl.struct(metric="ReadPosRankSum", value=hl.float(ds.info.ReadPosRankSum)),
                    hl.struct(metric="SiteQuality", value=hl.float(ds.qual)),
                    hl.struct(metric="SOR", value=hl.float(ds.info.SOR)),
                ],
            ),
        )
    )

    ds = ds.drop("filters", "ab_hist_alt", "dp_hist_all", "dp_hist_alt", "gq_hist_all", "gq_hist_alt", "info", "qual")

    #########
    # Flags #
    #########

    ds = ds.annotate(
        flags=hl.set(
            [hl.or_missing(ds.lcr, "lcr"), hl.or_missing(((ds.chrom == "X") | (ds.chrom == "Y")) & ~ds.nonpar, "par")]
        ).filter(hl.is_defined)
    )

    ################
    # Other fields #
    ################

    ds = ds.annotate(exome=hl.null(ds.genome.dtype))

    # Drop unused fields
    ds = ds.drop("popmax", "a_index", "old_locus", "old_alleles", "was_split")

    return ds

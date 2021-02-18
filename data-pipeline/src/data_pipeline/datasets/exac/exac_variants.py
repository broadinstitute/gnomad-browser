import hail as hl

from data_pipeline.data_types.locus import normalized_contig, x_position
from data_pipeline.data_types.variant import variant_id, variant_ids
from data_pipeline.data_types.variant.transcript_consequence import consequence_term_rank


# For multiallelic variants, these fields contain a value for each alt allele
PER_ALLELE_FIELDS = [
    "AC",
    "AC_Adj",
    "AC_Hemi",
    "AC_Hom",
    "AC_MALE",
    "AC_FEMALE",
    "AF",
    "AC_AFR",
    "AC_AMR",
    "AC_EAS",
    "AC_FIN",
    "AC_NFE",
    "AC_OTH",
    "AC_SAS",
    "Hemi_AFR",
    "Hemi_AMR",
    "Hemi_EAS",
    "Hemi_FIN",
    "Hemi_NFE",
    "Hemi_OTH",
    "Hemi_SAS",
    "Hom_AFR",
    "Hom_AMR",
    "Hom_EAS",
    "Hom_FIN",
    "Hom_NFE",
    "Hom_OTH",
    "Hom_SAS",
    "AC_CONSANGUINEOUS",
    "Hom_CONSANGUINEOUS",
    "MLEAC",
    "MLEAF",
    "DOUBLETON_DIST",
    "AGE_HISTOGRAM_HET",
    "AGE_HISTOGRAM_HOM",
    "POPMAX",
    "AC_POPMAX",
    "AN_POPMAX",
    "K1_RUN",
    "K2_RUN",
    "K3_RUN",
    "ESP_AC",
    "ESP_AF_GLOBAL",
    "ESP_AF_POPMAX",
    "KG_AC",
    "KG_AF_GLOBAL",
    "KG_AF_POPMAX",
    "clinvar_measureset_id",
    "clinvar_conflicted",
    "clinvar_pathogenic",
    "clinvar_mut",
]

# Load these VCF INFO fields into Elasticsearch
SELECT_INFO_FIELDS = [
    "AC",
    "AC_AFR",
    "AC_AMR",
    "AC_Adj",
    "AC_EAS",
    "AC_FIN",
    "AC_Hemi",
    "AC_Hom",
    "AC_NFE",
    "AC_OTH",
    "AC_SAS",
    "AF",
    "AN",
    "AN_AFR",
    "AN_AMR",
    "AN_Adj",
    "AN_EAS",
    "AN_FIN",
    "AN_NFE",
    "AN_OTH",
    "AN_SAS",
    "BaseQRankSum",
    "CCC",
    "ClippingRankSum",
    "DB",
    "DP",
    "DS",
    "END",
    "FS",
    "GQ_MEAN",
    "GQ_STDDEV",
    "HWP",
    "HaplotypeScore",
    "Hemi_AFR",
    "Hemi_AMR",
    "Hemi_EAS",
    "Hemi_FIN",
    "Hemi_NFE",
    "Hemi_OTH",
    "Hemi_SAS",
    "Het_AFR",
    "Het_AMR",
    "Het_EAS",
    "Het_FIN",
    "Het_NFE",
    "Het_OTH",
    "Het_SAS",
    "Hom_AFR",
    "Hom_AMR",
    "Hom_EAS",
    "Hom_FIN",
    "Hom_NFE",
    "Hom_OTH",
    "Hom_SAS",
    "InbreedingCoeff",
    "MLEAC",
    "MLEAF",
    "MQ",
    "MQ0",
    "MQRankSum",
    "NCC",
    "NEGATIVE_TRAIN_SITE",
    "POSITIVE_TRAIN_SITE",
    "QD",
    "ReadPosRankSum",
    "VQSLOD",
    "culprit",
    "DP_HIST",
    "GQ_HIST",
    "DOUBLETON_DIST",
    "AC_MALE",
    "AC_FEMALE",
    "AN_MALE",
    "AN_FEMALE",
    "AC_CONSANGUINEOUS",
    "AN_CONSANGUINEOUS",
    "Hom_CONSANGUINEOUS",
    "AGE_HISTOGRAM_HET",
    "AGE_HISTOGRAM_HOM",
    "AC_POPMAX",
    "AN_POPMAX",
    "POPMAX",
    "clinvar_measureset_id",
    "clinvar_conflicted",
    "clinvar_pathogenic",
    "clinvar_mut",
    "K1_RUN",
    "K2_RUN",
    "K3_RUN",
    "ESP_AF_POPMAX",
    "ESP_AF_GLOBAL",
    "ESP_AC",
    "KG_AF_POPMAX",
    "KG_AF_GLOBAL",
    "KG_AC",
]

# These fields contain integer values but are stored as strings
CONVERT_TO_INT_FIELDS = [
    "AC_MALE",
    "AC_FEMALE",
    "AN_MALE",
    "AN_FEMALE",
    "AC_CONSANGUINEOUS",
    "AN_CONSANGUINEOUS",
    "Hom_CONSANGUINEOUS",
    "AC_POPMAX",
    "AN_POPMAX",
    "ESP_AC",
    "KG_AC",
]

# These fields contain float values but are stored as strings
CONVERT_TO_FLOAT_FIELDS = ["ESP_AF_POPMAX", "ESP_AF_GLOBAL", "KG_AF_POPMAX", "KG_AF_GLOBAL"]

# VEP annotations are stored as pipe delimited strings with fields in this order
VEP_FIELDS = [
    "Allele",
    "Consequence",
    "IMPACT",
    "SYMBOL",
    "Gene",
    "Feature_type",
    "Feature",
    "BIOTYPE",
    "EXON",
    "INTRON",
    "HGVSc",
    "HGVSp",
    "cDNA_position",
    "CDS_position",
    "Protein_position",
    "Amino_acids",
    "Codons",
    "Existing_variation",
    "ALLELE_NUM",
    "DISTANCE",
    "STRAND",
    "FLAGS",
    "VARIANT_CLASS",
    "MINIMISED",
    "SYMBOL_SOURCE",
    "HGNC_ID",
    "CANONICAL",
    "TSL",
    "APPRIS",
    "CCDS",
    "ENSP",
    "SWISSPROT",
    "TREMBL",
    "UNIPARC",
    "GENE_PHENO",
    "SIFT",
    "PolyPhen",
    "DOMAINS",
    "HGVS_OFFSET",
    "GMAF",
    "AFR_MAF",
    "AMR_MAF",
    "EAS_MAF",
    "EUR_MAF",
    "SAS_MAF",
    "AA_MAF",
    "EA_MAF",
    "ExAC_MAF",
    "ExAC_Adj_MAF",
    "ExAC_AFR_MAF",
    "ExAC_AMR_MAF",
    "ExAC_EAS_MAF",
    "ExAC_FIN_MAF",
    "ExAC_NFE_MAF",
    "ExAC_OTH_MAF",
    "ExAC_SAS_MAF",
    "CLIN_SIG",
    "SOMATIC",
    "PHENO",
    "PUBMED",
    "MOTIF_NAME",
    "MOTIF_POS",
    "HIGH_INF_POS",
    "MOTIF_SCORE_CHANGE",
    "LoF",
    "LoF_filter",
    "LoF_flags",
    "LoF_info",
    "context",
    "ancestral",
]


def split_position_start(position):
    return hl.or_missing(
        hl.is_defined(position),
        hl.bind(lambda start: hl.if_else(start == "?", hl.null(hl.tint), hl.int(start)), position.split("-")[0]),
    )


def split_position_end(position):
    return hl.or_missing(
        hl.is_defined(position),
        hl.bind(lambda start: hl.if_else(start == "?", hl.null(hl.tint), hl.int(start)), position.split("-")[-1]),
    )


def import_exac_vcf(path):
    ds = hl.import_vcf(path, force_bgz=True, skip_invalid_loci=True).rows()

    ds = hl.split_multi(ds)

    ds = ds.repartition(5000, shuffle=True)

    # Get value corresponding to the split variant
    ds = ds.annotate(
        info=ds.info.annotate(
            **{
                field: hl.or_missing(hl.is_defined(ds.info[field]), ds.info[field][ds.a_index - 1])
                for field in PER_ALLELE_FIELDS
            }
        )
    )

    # For DP_HIST and GQ_HIST, the first value in the array contains the histogram for all individuals,
    # which is the same in each alt allele's variant.
    ds = ds.annotate(
        info=ds.info.annotate(
            DP_HIST=hl.struct(all=ds.info.DP_HIST[0], alt=ds.info.DP_HIST[ds.a_index]),
            GQ_HIST=hl.struct(all=ds.info.GQ_HIST[0], alt=ds.info.GQ_HIST[ds.a_index]),
        )
    )

    ds = ds.cache()

    # Convert "NA" and empty strings into null values
    # Convert fields in chunks to avoid "Method code too large" errors
    for i in range(0, len(SELECT_INFO_FIELDS), 10):
        ds = ds.annotate(
            info=ds.info.annotate(
                **{
                    field: hl.or_missing(
                        hl.is_defined(ds.info[field]),
                        hl.if_else(
                            (hl.str(ds.info[field]) == "") | (hl.str(ds.info[field]) == "NA"),
                            hl.null(ds.info[field].dtype),
                            ds.info[field],
                        ),
                    )
                    for field in SELECT_INFO_FIELDS[i : i + 10]
                }
            )
        )

    # Convert field types
    ds = ds.annotate(
        info=ds.info.annotate(
            **{
                field: hl.if_else(ds.info[field] == "", hl.null(hl.tint), hl.int(ds.info[field]))
                for field in CONVERT_TO_INT_FIELDS
            }
        )
    )
    ds = ds.annotate(
        info=ds.info.annotate(
            **{
                field: hl.if_else(ds.info[field] == "", hl.null(hl.tfloat), hl.float(ds.info[field]))
                for field in CONVERT_TO_FLOAT_FIELDS
            }
        )
    )

    # Format VEP annotations to mimic the output of hail.vep
    ds = ds.annotate(
        info=ds.info.annotate(
            CSQ=ds.info.CSQ.map(
                lambda s: s.replace("%3A", ":")
                .replace("%3B", ";")
                .replace("%3D", "=")
                .replace("%25", "%")
                .replace("%2C", ",")
            )
        )
    )
    ds = ds.annotate(
        vep=hl.struct(
            transcript_consequences=ds.info.CSQ.map(
                lambda csq_str: hl.bind(
                    lambda csq_values: hl.struct(
                        **{
                            field: hl.if_else(csq_values[index] == "", hl.null(hl.tstr), csq_values[index])
                            for index, field in enumerate(VEP_FIELDS)
                        }
                    ),
                    csq_str.split(r"\|"),
                )
            )
            .filter(lambda annotation: annotation.Feature.startswith("ENST"))
            .filter(lambda annotation: hl.int(annotation.ALLELE_NUM) == ds.a_index)
            .map(
                lambda annotation: annotation.select(
                    amino_acids=annotation.Amino_acids,
                    biotype=annotation.BIOTYPE,
                    canonical=annotation.CANONICAL == "YES",
                    # cDNA_position may contain either "start-end" or, when start == end, "start"
                    cdna_start=split_position_start(annotation.cDNA_position),
                    cdna_end=split_position_end(annotation.cDNA_position),
                    codons=annotation.Codons,
                    consequence_terms=annotation.Consequence.split("&"),
                    distance=hl.int(annotation.DISTANCE),
                    domains=hl.or_missing(
                        hl.is_defined(annotation.DOMAINS),
                        annotation.DOMAINS.split("&").map(
                            lambda d: hl.struct(db=d.split(":")[0], name=d.split(":")[1])
                        ),
                    ),
                    exon=annotation.EXON,
                    gene_id=annotation.Gene,
                    gene_symbol=annotation.SYMBOL,
                    gene_symbol_source=annotation.SYMBOL_SOURCE,
                    hgnc_id=annotation.HGNC_ID,
                    hgvsc=annotation.HGVSc,
                    hgvsp=annotation.HGVSp,
                    lof=annotation.LoF,
                    lof_filter=annotation.LoF_filter,
                    lof_flags=annotation.LoF_flags,
                    lof_info=annotation.LoF_info,
                    # PolyPhen field contains "polyphen_prediction(polyphen_score)"
                    polyphen_prediction=hl.or_missing(
                        hl.is_defined(annotation.PolyPhen), annotation.PolyPhen.split(r"\(")[0]
                    ),
                    protein_id=annotation.ENSP,
                    # Protein_position may contain either "start-end" or, when start == end, "start"
                    protein_start=split_position_start(annotation.Protein_position),
                    protein_end=split_position_end(annotation.Protein_position),
                    # SIFT field contains "sift_prediction(sift_score)"
                    sift_prediction=hl.or_missing(hl.is_defined(annotation.SIFT), annotation.SIFT.split(r"\(")[0]),
                    transcript_id=annotation.Feature,
                )
            )
        )
    )

    ds = ds.annotate(
        vep=ds.vep.annotate(
            most_severe_consequence=hl.bind(
                lambda all_consequence_terms: hl.or_missing(
                    all_consequence_terms.size() != 0, hl.sorted(all_consequence_terms, key=consequence_term_rank)[0]
                ),
                ds.vep.transcript_consequences.flatmap(lambda c: c.consequence_terms),
            )
        )
    )

    ds = ds.cache()

    QUALITY_METRIC_HISTOGRAM_BIN_EDGES = [i * 5 for i in range(21)]

    ds = ds.select(
        variant_id=variant_id(ds.locus, ds.alleles),
        reference_genome="GRCh37",
        chrom=normalized_contig(ds.locus.contig),
        pos=ds.locus.position,
        xpos=x_position(ds.locus),
        ref=ds.alleles[0],
        alt=ds.alleles[1],
        rsid=ds.rsid,
        exome=hl.struct(
            ac=ds.info.AC_Adj,
            an=ds.info.AN_Adj,
            homozygote_count=ds.info.AC_Hom,
            hemizygote_count=hl.or_else(ds.info.AC_Hemi, 0),
            filters=hl.set(hl.if_else(ds.info.AC_Adj == 0, ds.filters.add("AC0"), ds.filters)),
            populations=[
                hl.struct(
                    id=pop_id,
                    ac=ds.info[f"AC_{pop_id}"],
                    an=ds.info[f"AN_{pop_id}"],
                    hemizygote_count=hl.or_else(ds.info[f"Hemi_{pop_id}"], 0),
                    homozygote_count=ds.info[f"Hom_{pop_id}"],
                )
                for pop_id in ["AFR", "AMR", "EAS", "FIN", "NFE", "OTH", "SAS"]
            ],
            age_distribution=hl.struct(
                het=hl.rbind(
                    hl.or_else(ds.info.AGE_HISTOGRAM_HET, "0|0|0|0|0|0|0|0|0|0|0|0").split(r"\|").map(hl.float),
                    lambda bins: hl.struct(
                        bin_edges=[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
                        bin_freq=bins[1:11],
                        n_smaller=bins[0],
                        n_larger=bins[11],
                    ),
                ),
                hom=hl.rbind(
                    hl.or_else(ds.info.AGE_HISTOGRAM_HOM, "0|0|0|0|0|0|0|0|0|0|0|0").split(r"\|").map(hl.float),
                    lambda bins: hl.struct(
                        bin_edges=[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
                        bin_freq=bins[1:11],
                        n_smaller=bins[0],
                        n_larger=bins[11],
                    ),
                ),
            ),
            quality_metrics=hl.struct(
                genotype_depth=hl.struct(
                    all_raw=hl.struct(
                        bin_edges=QUALITY_METRIC_HISTOGRAM_BIN_EDGES,
                        bin_freq=ds.info.DP_HIST.all.split(r"\|").map(hl.float),
                    ),
                    alt_raw=hl.struct(
                        bin_edges=QUALITY_METRIC_HISTOGRAM_BIN_EDGES,
                        bin_freq=ds.info.DP_HIST.alt.split(r"\|").map(hl.float),
                    ),
                ),
                genotype_quality=hl.struct(
                    all_raw=hl.struct(
                        bin_edges=QUALITY_METRIC_HISTOGRAM_BIN_EDGES,
                        bin_freq=ds.info.GQ_HIST.all.split(r"\|").map(hl.float),
                    ),
                    alt_raw=hl.struct(
                        bin_edges=QUALITY_METRIC_HISTOGRAM_BIN_EDGES,
                        bin_freq=ds.info.GQ_HIST.alt.split(r"\|").map(hl.float),
                    ),
                ),
                site_quality_metrics=[
                    hl.struct(metric="BaseQRankSum", value=hl.float(ds.info.BaseQRankSum)),
                    hl.struct(metric="ClippingRankSum", value=hl.float(ds.info.ClippingRankSum)),
                    hl.struct(metric="DP", value=hl.float(ds.info.DP)),
                    hl.struct(metric="FS", value=hl.float(ds.info.FS)),
                    hl.struct(metric="InbreedingCoeff", value=hl.float(ds.info.InbreedingCoeff)),
                    hl.struct(metric="MQ", value=hl.float(ds.info.MQ)),
                    hl.struct(metric="MQRankSum", value=hl.float(ds.info.MQRankSum)),
                    hl.struct(metric="QD", value=hl.float(ds.info.QD)),
                    hl.struct(metric="ReadPosRankSum", value=hl.float(ds.info.ReadPosRankSum)),
                    hl.struct(metric="SiteQuality", value=hl.float(ds.qual)),
                    hl.struct(metric="VQSLOD", value=hl.float(ds.info.VQSLOD)),
                ],
            ),
        ),
        colocated_variants=hl.rbind(
            variant_id(ds.locus, ds.alleles),
            lambda this_variant_id: variant_ids(ds.old_locus, ds.old_alleles).filter(
                lambda v_id: v_id != this_variant_id
            ),
        ),
        vep=ds.vep,
    )

    ds = ds.annotate(genome=hl.null(ds.exome.dtype))

    return ds

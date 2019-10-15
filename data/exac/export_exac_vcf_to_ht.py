import argparse

import hail as hl

from data_utils.computed_fields import variant_id, variant_ids, sorted_transcript_consequences_v3, x_position
from data_utils.computed_fields.vep import consequence_term_rank

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
        hl.bind(lambda start: hl.cond(start == "?", hl.null(hl.tint), hl.int(start)), position.split("-")[0]),
    )


def split_position_end(position):
    return hl.or_missing(
        hl.is_defined(position),
        hl.bind(lambda start: hl.cond(start == "?", hl.null(hl.tint), hl.int(start)), position.split("-")[-1]),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input-url", help="URL of ExAC sites VCF", default="gs://exac/170122_exacv1_bundle/ExAC.r1.sites.vep.vcf.gz"
    )
    parser.add_argument("--output-url", help="URL to write Hail table to", required=True)
    parser.add_argument("--subset", help="Filter variants to this chrom:start-end range")
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    print("\n=== Importing VCF ===")

    ds = hl.import_vcf(args.input_url, force_bgz=True, min_partitions=2000, skip_invalid_loci=True).rows()

    if args.subset:
        print(f"\n=== Filtering to interval {args.subset} ===")
        subset_interval = hl.parse_locus_interval(args.subset)
        ds = ds.filter(subset_interval.contains(ds.locus))

    print("\n=== Splitting multiallelic variants ===")

    ds = hl.split_multi(ds)

    ds = ds.repartition(2000, shuffle=True)

    # Get value corresponding to the split variant
    ds = ds.annotate(
        info=ds.info.annotate(
            **{
                field: hl.or_missing(hl.is_defined(ds.info[field]), ds.info[field][ds.a_index - 1])
                for field in PER_ALLELE_FIELDS
            }
        )
    )

    ds = ds.cache()

    print("\n=== Munging data ===")

    # Convert "NA" and empty strings into null values
    # Convert fields in chunks to avoid "Method code too large" errors
    for i in range(0, len(SELECT_INFO_FIELDS), 10):
        ds = ds.annotate(
            info=ds.info.annotate(
                **{
                    field: hl.or_missing(
                        hl.is_defined(ds.info[field]),
                        hl.bind(
                            lambda value: hl.cond(
                                (value == "") | (value == "NA"), hl.null(ds.info[field].dtype), ds.info[field]
                            ),
                            hl.str(ds.info[field]),
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
                field: hl.cond(ds.info[field] == "", hl.null(hl.tint), hl.int(ds.info[field]))
                for field in CONVERT_TO_INT_FIELDS
            }
        )
    )
    ds = ds.annotate(
        info=ds.info.annotate(
            **{
                field: hl.cond(ds.info[field] == "", hl.null(hl.tfloat), hl.float(ds.info[field]))
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
                            field: hl.cond(csq_values[index] == "", hl.null(hl.tstr), csq_values[index])
                            for index, field in enumerate(VEP_FIELDS)
                        }
                    ),
                    csq_str.split("\\|"),
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
                        hl.is_defined(annotation.PolyPhen), annotation.PolyPhen.split("\\(")[0]
                    ),
                    protein_id=annotation.ENSP,
                    # Protein_position may contain either "start-end" or, when start == end, "start"
                    protein_start=split_position_start(annotation.Protein_position),
                    protein_end=split_position_end(annotation.Protein_position),
                    # SIFT field contains "sift_prediction(sift_score)"
                    sift_prediction=hl.or_missing(hl.is_defined(annotation.SIFT), annotation.SIFT.split("\\(")[0]),
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

    print("\n=== Adding derived fields ===")

    ds = ds.annotate(sorted_transcript_consequences=sorted_transcript_consequences_v3(ds.vep))

    ds = ds.select(
        "filters",
        "qual",
        "rsid",
        "sorted_transcript_consequences",
        AC=ds.info.AC,
        AC_Adj=ds.info.AC_Adj,
        AC_Hemi=ds.info.AC_Hemi,
        AC_Hom=ds.info.AC_Hom,
        AF=ds.info.AF,
        AN=ds.info.AN,
        AN_Adj=ds.info.AN_Adj,
        BaseQRankSum=ds.info.BaseQRankSum,
        CCC=ds.info.CCC,
        ClippingRankSum=ds.info.ClippingRankSum,
        DB=ds.info.DB,
        DP=ds.info.DP,
        DS=ds.info.DS,
        END=ds.info.END,
        FS=ds.info.FS,
        GQ_MEAN=ds.info.GQ_MEAN,
        GQ_STDDEV=ds.info.GQ_STDDEV,
        HWP=ds.info.HWP,
        HaplotypeScore=ds.info.HaplotypeScore,
        InbreedingCoeff=ds.info.InbreedingCoeff,
        MLEAC=ds.info.MLEAC,
        MLEAF=ds.info.MLEAF,
        MQ=ds.info.MQ,
        MQ0=ds.info.MQ0,
        MQRankSum=ds.info.MQRankSum,
        NCC=ds.info.NCC,
        NEGATIVE_TRAIN_SITE=ds.info.NEGATIVE_TRAIN_SITE,
        POSITIVE_TRAIN_SITE=ds.info.POSITIVE_TRAIN_SITE,
        QD=ds.info.QD,
        ReadPosRankSum=ds.info.ReadPosRankSum,
        VQSLOD=ds.info.VQSLOD,
        culprit=ds.info.culprit,
        DP_HIST=ds.info.DP_HIST,
        GQ_HIST=ds.info.GQ_HIST,
        DOUBLETON_DIST=ds.info.DOUBLETON_DIST,
        AC_CONSANGUINEOUS=ds.info.AC_CONSANGUINEOUS,
        AN_CONSANGUINEOUS=ds.info.AN_CONSANGUINEOUS,
        Hom_CONSANGUINEOUS=ds.info.Hom_CONSANGUINEOUS,
        AGE_HISTOGRAM_HET=ds.info.AGE_HISTOGRAM_HET,
        AGE_HISTOGRAM_HOM=ds.info.AGE_HISTOGRAM_HOM,
        AC_POPMAX=ds.info.AC_POPMAX,
        AN_POPMAX=ds.info.AN_POPMAX,
        POPMAX=ds.info.POPMAX,
        K1_RUN=ds.info.K1_RUN,
        K2_RUN=ds.info.K2_RUN,
        K3_RUN=ds.info.K3_RUN,
        ESP_AF_POPMAX=ds.info.ESP_AF_POPMAX,
        ESP_AF_GLOBAL=ds.info.ESP_AF_GLOBAL,
        ESP_AC=ds.info.ESP_AC,
        KG_AF_POPMAX=ds.info.KG_AF_POPMAX,
        KG_AF_GLOBAL=ds.info.KG_AF_GLOBAL,
        KG_AC=ds.info.KG_AC,
        AC_FEMALE=ds.info.AC_FEMALE,
        AN_FEMALE=ds.info.AN_FEMALE,
        AC_MALE=ds.info.AC_MALE,
        AN_MALE=ds.info.AN_MALE,
        populations=hl.struct(
            **{
                pop_id: hl.struct(
                    AC=ds.info[f"AC_{pop_id}"],
                    AN=ds.info[f"AN_{pop_id}"],
                    hemi=ds.info[f"Hemi_{pop_id}"],
                    hom=ds.info[f"Hom_{pop_id}"],
                )
                for pop_id in ["AFR", "AMR", "EAS", "FIN", "NFE", "OTH", "SAS"]
            }
        ),
        original_alt_alleles=variant_ids(ds.old_locus, ds.old_alleles),
        variant_id=variant_id(ds.locus, ds.alleles),
        xpos=x_position(ds.locus),
    )

    print("\n=== Writing table ===")

    ds.write(args.output_url)


if __name__ == "__main__":
    main()

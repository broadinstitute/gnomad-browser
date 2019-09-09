import argparse

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    CONSEQUENCE_TERM_RANK_LOOKUP,
    get_expr_for_alt_allele,
    get_expr_for_contig,
    get_expr_for_consequence_lc_lof_flag,
    get_expr_for_variant_lc_lof_flag,
    get_expr_for_genes_with_lc_lof_flag,
    get_expr_for_consequence_loftee_flag_flag,
    get_expr_for_variant_loftee_flag_flag,
    get_expr_for_genes_with_loftee_flag_flag,
    get_expr_for_ref_allele,
    get_expr_for_variant_id,
    get_expr_for_variant_ids,
    get_expr_for_vep_sorted_transcript_consequences_array,
    get_expr_for_xpos,
)


p = argparse.ArgumentParser()
p.add_argument(
    "--input-url", help="URL of ExAC sites VCF", default="gs://exac/170122_exacv1_bundle/ExAC.r1.sites.vep.vcf.gz"
)
p.add_argument("--output-url", help="URL to write Hail table to", required=True)
p.add_argument("--subset", help="Filter variants to this chrom:start-end range")
args = p.parse_args()

hl.init(log="/tmp/hail.log")

print("\n=== Importing VCF ===")

mt = hl.import_vcf(args.input_url, force_bgz=True, min_partitions=2000, skip_invalid_loci=True)

# Drop entry values
mt = mt.drop("AD", "DP", "GQ", "GT", "MIN_DP", "PL", "SB")

if args.subset:
    print(f"\n=== Filtering to interval {args.subset} ===")
    subset_interval = hl.parse_locus_interval(args.subset)
    mt = mt.filter_rows(subset_interval.contains(mt.locus))

print("\n=== Splitting multiallelic variants ===")

mt = hl.split_multi(mt)

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

# Get value corresponding to the split variant
mt = mt.annotate_rows(
    info=mt.info.annotate(
        **{
            field: hl.or_missing(hl.is_defined(mt.info[field]), mt.info[field][mt.a_index - 1])
            for field in PER_ALLELE_FIELDS
        }
    )
)

print("\n=== Munging data ===")

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

# Convert "NA" and empty strings into null values
# Convert fields in chunks to avoid "Method code too large" errors
for i in range(0, len(SELECT_INFO_FIELDS), 10):
    mt = mt.annotate_rows(
        info=mt.info.annotate(
            **{
                field: hl.or_missing(
                    hl.is_defined(mt.info[field]),
                    hl.bind(
                        lambda value: hl.cond(
                            (value == "") | (value == "NA"), hl.null(mt.info[field].dtype), mt.info[field]
                        ),
                        hl.str(mt.info[field]),
                    ),
                )
                for field in SELECT_INFO_FIELDS[i : i + 10]
            }
        )
    )

# Convert field types
mt = mt.annotate_rows(
    info=mt.info.annotate(
        **{
            field: hl.cond(mt.info[field] == "", hl.null(hl.tint), hl.int(mt.info[field]))
            for field in CONVERT_TO_INT_FIELDS
        }
    )
)
mt = mt.annotate_rows(
    info=mt.info.annotate(
        **{
            field: hl.cond(mt.info[field] == "", hl.null(hl.tfloat), hl.float(mt.info[field]))
            for field in CONVERT_TO_FLOAT_FIELDS
        }
    )
)

hl.summarize_variants(mt)

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


# Format VEP annotations to mimic the output of hail.vep
mt = mt.annotate_rows(
    vep=hl.struct(
        transcript_consequences=mt.info.CSQ.map(
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
        .filter(lambda annotation: hl.int(annotation.ALLELE_NUM) == mt.a_index)
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
                    annotation.DOMAINS.split("&").map(lambda d: hl.struct(db=d.split(":")[0], name=d.split(":")[1])),
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

mt = mt.annotate_rows(
    vep=mt.vep.annotate(
        most_severe_consequence=hl.bind(
            lambda all_consequence_terms: hl.or_missing(
                all_consequence_terms.size() != 0,
                hl.sorted(all_consequence_terms, key=lambda t: CONSEQUENCE_TERM_RANK_LOOKUP.get(t))[0],
            ),
            mt.vep.transcript_consequences.flatmap(lambda c: c.consequence_terms),
        )
    )
)

print("\n=== Adding derived fields ===")

mt = mt.annotate_rows(
    sortedTranscriptConsequences=get_expr_for_vep_sorted_transcript_consequences_array(vep_root=mt.vep)
)

mt = mt.select_rows(
    "filters",
    "qual",
    "rsid",
    AC=mt.info.AC,
    AC_Adj=mt.info.AC_Adj,
    AC_Hemi=mt.info.AC_Hemi,
    AC_Hom=mt.info.AC_Hom,
    AF=mt.info.AF,
    AN=mt.info.AN,
    AN_Adj=mt.info.AN_Adj,
    BaseQRankSum=mt.info.BaseQRankSum,
    CCC=mt.info.CCC,
    ClippingRankSum=mt.info.ClippingRankSum,
    DB=mt.info.DB,
    DP=mt.info.DP,
    DS=mt.info.DS,
    END=mt.info.END,
    FS=mt.info.FS,
    GQ_MEAN=mt.info.GQ_MEAN,
    GQ_STDDEV=mt.info.GQ_STDDEV,
    HWP=mt.info.HWP,
    HaplotypeScore=mt.info.HaplotypeScore,
    InbreedingCoeff=mt.info.InbreedingCoeff,
    MLEAC=mt.info.MLEAC,
    MLEAF=mt.info.MLEAF,
    MQ=mt.info.MQ,
    MQ0=mt.info.MQ0,
    MQRankSum=mt.info.MQRankSum,
    NCC=mt.info.NCC,
    NEGATIVE_TRAIN_SITE=mt.info.NEGATIVE_TRAIN_SITE,
    POSITIVE_TRAIN_SITE=mt.info.POSITIVE_TRAIN_SITE,
    QD=mt.info.QD,
    ReadPosRankSum=mt.info.ReadPosRankSum,
    VQSLOD=mt.info.VQSLOD,
    culprit=mt.info.culprit,
    DP_HIST=mt.info.DP_HIST,
    GQ_HIST=mt.info.GQ_HIST,
    DOUBLETON_DIST=mt.info.DOUBLETON_DIST,
    AC_CONSANGUINEOUS=mt.info.AC_CONSANGUINEOUS,
    AN_CONSANGUINEOUS=mt.info.AN_CONSANGUINEOUS,
    Hom_CONSANGUINEOUS=mt.info.Hom_CONSANGUINEOUS,
    AGE_HISTOGRAM_HET=mt.info.AGE_HISTOGRAM_HET,
    AGE_HISTOGRAM_HOM=mt.info.AGE_HISTOGRAM_HOM,
    AC_POPMAX=mt.info.AC_POPMAX,
    AN_POPMAX=mt.info.AN_POPMAX,
    POPMAX=mt.info.POPMAX,
    K1_RUN=mt.info.K1_RUN,
    K2_RUN=mt.info.K2_RUN,
    K3_RUN=mt.info.K3_RUN,
    ESP_AF_POPMAX=mt.info.ESP_AF_POPMAX,
    ESP_AF_GLOBAL=mt.info.ESP_AF_GLOBAL,
    ESP_AC=mt.info.ESP_AC,
    KG_AF_POPMAX=mt.info.KG_AF_POPMAX,
    KG_AF_GLOBAL=mt.info.KG_AF_GLOBAL,
    KG_AC=mt.info.KG_AC,
    AC_FEMALE=mt.info.AC_FEMALE,
    AN_FEMALE=mt.info.AN_FEMALE,
    AC_MALE=mt.info.AC_MALE,
    AN_MALE=mt.info.AN_MALE,
    flags=hl.struct(
        lc_lof=get_expr_for_variant_lc_lof_flag(mt.sortedTranscriptConsequences),
        lof_flag=get_expr_for_variant_loftee_flag_flag(mt.sortedTranscriptConsequences),
    ),
    populations=hl.struct(
        **{
            pop_id: hl.struct(
                AC=mt.info[f"AC_{pop_id}"],
                AN=mt.info[f"AN_{pop_id}"],
                hemi=mt.info[f"Hemi_{pop_id}"],
                hom=mt.info[f"Hom_{pop_id}"],
            )
            for pop_id in ["AFR", "AMR", "EAS", "FIN", "NFE", "OTH", "SAS"]
        }
    ),
    clinvar=hl.struct(
        conflicted=mt.info.clinvar_conflicted,
        measureset_id=mt.info.clinvar_measureset_id,
        mut=mt.info.clinvar_mut,
        pathogenic=mt.info.clinvar_pathogenic,
    ),
    alt=get_expr_for_alt_allele(mt),
    chrom=get_expr_for_contig(mt.locus),
    pos=mt.locus.position,
    ref=get_expr_for_ref_allele(mt),
    original_alt_alleles=get_expr_for_variant_ids(mt.old_locus, mt.old_alleles),
    sortedTranscriptConsequences=hl.bind(
        lambda genes_with_lc_lof_flag, genes_with_loftee_flag_flag: mt.sortedTranscriptConsequences.map(
            lambda csq: csq.annotate(
                flags=hl.struct(
                    lc_lof=get_expr_for_consequence_lc_lof_flag(csq),
                    lc_lof_in_gene=genes_with_lc_lof_flag.contains(csq.gene_id),
                    lof_flag=get_expr_for_consequence_loftee_flag_flag(csq),
                    lof_flag_in_gene=genes_with_loftee_flag_flag.contains(csq.gene_id),
                    nc_transcript=(csq.category == "lof") & (csq.lof == ""),
                )
            )
        ),
        get_expr_for_genes_with_lc_lof_flag(mt.sortedTranscriptConsequences),
        get_expr_for_genes_with_loftee_flag_flag(mt.sortedTranscriptConsequences),
    ),
    variant_id=get_expr_for_variant_id(mt),
    xpos=get_expr_for_xpos(mt.locus),
)

# Drop key columns for export
rows = mt.rows()
rows = rows.order_by(rows.variant_id).drop("locus", "alleles")

rows.write(args.output_url)

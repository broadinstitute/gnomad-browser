import attr
from typing import List, Dict, Optional, Set, Tuple, Union


# Locus Type
@attr.define
class Locus:
    contig: str
    position: int


# Various Structures
@attr.define
class Frequency:
    AC: int
    AN: int
    homozygote_count: int
    AF: Union[float, None]


@attr.define
class Grpmax:
    AC: Union[int, None]
    AN: Union[int, None]
    homozygote_count: Union[int, None]
    AF: Union[float, None]
    grp: Union[str, None]
    faf95: Union[float, None]


# Many rows in sample data are (NA, NA,... etc)
# +---------------------------------------------------------------------------------------------+
# | grpmax                                                                                      |
# +---------------------------------------------------------------------------------------------+
# | array<struct{AC: int32, AF: float64, AN: int32, homozygote_count: int32, grp: str, faf95... |
# +---------------------------------------------------------------------------------------------+
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(1,4.07e-04,2456,0,"eas",0.00e+00),(1,4.07e-04,2456,0,"eas",0.00e+00)]                     |
# | [(1,4.39e-05,22760,0,"afr",0.00e+00),(1,4.39e-05,22760,0,"afr",0.00e+00)]                   |
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(2,3.78e-05,52912,0,"nfe",6.27e-06),(2,3.78e-05,52912,0,"nfe",6.27e-06)]                   |
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(NA,NA,NA,NA,NA,NA),(NA,NA,NA,NA,NA,NA)]                                                   |
# | [(1,2.16e-04,4632,0,"nfe",0.00e+00),(1,2.16e-04,4632,0,"nfe",0.00e+00)]                     |
# +---------------------------------------------------------------------------------------------+


@attr.define
class Faf:
    faf95: float
    faf99: float


# In [71]: ht.faf.take(1)
# Out[71]:
# [[Struct(faf95=0.0, faf99=0.0),
#   Struct(faf95=0.0, faf99=0.0),
#   Struct(faf95=0.0, faf99=0.0),
#   Struct(faf95=0.0, faf99=0.0),
#   Struct(faf95=0.0, faf99=0.0),
#   Struct(faf95=0.0, faf99=0.0),
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None,
#   None]]


@attr.define
class Vrs:
    VRS_Allele_IDs: List[str]
    VRS_Starts: List[int]
    VRS_Ends: List[int]
    VRS_States: List[str]


@attr.define
class Info:
    QUALapprox: int
    SB: List[int]
    MQ: float
    MQRankSum: float
    VarDP: int
    AS_ReadPosRankSum: Union[float, None]
    AS_pab_max: float
    AS_QD: float
    AS_MQ: float
    QD: float
    AS_MQRankSum: float
    FS: float
    AS_FS: float
    ReadPosRankSum: float
    AS_QUALapprox: int
    AS_SB_TABLE: List[int]
    AS_VarDP: int
    AS_SOR: float
    SOR: float
    singleton: bool
    transmitted_singleton: bool
    omni: bool
    mills: bool
    monoallelic: bool
    AS_VQSLOD: float
    InbreedingCoeff: float
    vrs: Vrs  # defined later


@attr.define
class Consequence:
    allele_num: int
    consequence_terms: List[str]
    impact: str
    variant_allele: str


@attr.define
class Domain:
    db: str
    name: str


@attr.define
class TranscriptConsequence:
    allele_num: int
    amino_acids: str
    appris: str
    biotype: str
    canonical: Union[int, None]
    ccds: str
    cdna_start: Union[int, None]
    cdna_end: Union[int, None]
    cds_end: Union[int, None]
    cds_start: Union[int, None]
    codons: str
    consequence_terms: List[str]
    distance: int
    domains: Union[List[Domain], None]
    exon: str
    flags: str
    gene_id: str
    gene_pheno: Union[int, None]
    gene_symbol: str
    gene_symbol_source: str
    hgnc_id: str
    hgvsc: str
    hgvsp: str
    hgvs_offset: Union[int, None]
    impact: str
    intron: str
    lof: str
    lof_flags: str
    lof_filter: str
    lof_info: str
    mane_select: str
    mane_plus_clinical: str
    mirna: Union[List[str], None]
    polyphen_prediction: str
    polyphen_score: Union[float, None]
    protein_end: Union[int, None]
    protein_start: Union[int, None]
    protein_id: str
    sift_prediction: Union[str, None]
    sift_score: Union[float, None]
    source: str
    strand: int
    transcript_id: str
    tsl: Union[int, None]
    uniprot_isoform: Union[List[str], None]
    variant_allele: str


@attr.define
class Vep:
    allele_string: str
    end: int
    id: str
    input: str
    intergenic_consequences: Union[List[Consequence], None]
    most_severe_consequence: str
    motif_feature_consequences: Union[List[Consequence], None]
    regulatory_feature_consequences: Union[List[Consequence], None]
    seq_region_name: str
    start: int
    strand: int
    transcript_consequences: List[TranscriptConsequence]
    variant_class: str


@attr.define
class Rf:
    rf_positive_label: bool
    rf_negative_label: bool
    rf_label: str
    rf_train: bool
    rf_tp_probability: float


@attr.define
class RegionFlag:
    lcr: bool
    segdup: bool
    non_par: bool


@attr.define
class AlleleInfo:
    variant_type: str
    allele_type: str
    n_alt_alleles: int
    was_mixed: bool


@attr.define
class Histogram:
    bin_edges: List[float]
    bin_freq: List[int]
    n_smaller: int
    n_larger: int


@attr.define
class QualHistograms:
    gq_hist_all: Histogram
    dp_hist_all: Histogram
    gq_hist_alt: Histogram
    dp_hist_alt: Histogram
    ab_hist_alt: Histogram


@attr.define
class AgeHistograms:
    age_hist_hom: Histogram
    age_hist_ht: Histogram


@attr.define
class Histograms:
    qual_hists: QualHistograms
    raw_qual_hists: QualHistograms
    age_hists: List[AgeHistograms]  # Should this be a list?


@attr.define
class CaddPredictor:
    phred: float
    raw_score: float
    has_duplicate: bool


@attr.define
class RevelPredictor:
    revel_score: float
    has_duplicate: bool


@attr.define
class SpliceAiPredictor:
    splice_ai_score: Union[float, None]
    splice_consequence: Union[str, None]
    has_duplicate: Union[bool, None]


@attr.define
class PangolinPredictor:
    pangolin_score: float


@attr.define
class InSilicoPredictors:
    cadd: CaddPredictor
    revel: Union[RevelPredictor, None]
    splice_ai: Union[SpliceAiPredictor, None]
    pangolin: PangolinPredictor


@attr.define
class InitialVariant:
    locus: Locus
    alleles: List[str]
    freq: List[Frequency]
    grpmax: List[Grpmax]
    faf: List[Union[Faf, None]]
    a_index: int
    was_split: bool
    rsid: Union[Set[str], None]
    filters: Set[str]
    info: Info
    vep: Union[Vep, None]
    rf: Rf
    region_flag: RegionFlag
    allele_info: AlleleInfo
    histograms: Histograms
    in_silico_predictors: InSilicoPredictors

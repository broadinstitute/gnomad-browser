import attr
from typing import List, Set, Union, Optional, Any


@attr.define
class Locus:
    contig: str
    position: int


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
    AF: Union[float, None]
    homozygote_count: Union[int, None]
    gen_anc: Union[str, None] = None


class GrpmaxBySubsetGenomes:
    gnomad: Union[Grpmax, None]
    non_ukb: Union[Grpmax, None]


@attr.define
class Faf:
    faf95: float
    faf99: float


@attr.define
class FafMax:
    faf95_max: Union[float, None]
    faf95_max_gen_anc: Union[str, None]
    faf99_max: Union[float, None] = None
    faf99_max_gen_anc: Optional[str] = None
    joint_fafmax_data_type: Optional[str] = None


@attr.define
class FafMaxBySubset:
    gnomad: Union[FafMax, None]
    non_ukb: Union[FafMax, None]


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
    MQRankSum: Union[float, None]
    VarDP: int
    AS_ReadPosRankSum: Union[float, None]
    AS_pab_max: Union[float, None]
    AS_QD: float
    AS_MQ: float
    QD: float
    AS_MQRankSum: Union[float, None]
    FS: Union[float, None]
    AS_FS: Union[float, None]
    ReadPosRankSum: Union[float, None]
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
    inbreeding_coeff: float
    vrs: Vrs
    only_het: bool
    sibling_singleton: Optional[bool] = None


@attr.define
class Consequence:
    regulatory_feature_id: str
    biotype: str
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
    allele_num: Union[int, None]
    amino_acids: Union[str, None]
    appris: Union[str, None]
    biotype: Union[str, None]
    canonical: Union[int, None]
    ccds: Union[str, None]
    cdna_start: Union[int, None]
    cdna_end: Union[int, None]
    cds_end: Union[int, None]
    cds_start: Union[int, None]
    codons: Union[str, None]
    consequence_terms: List[str]
    distance: Union[int, None]
    domains: Union[List[Domain], None]
    exon: Union[str, None]
    flags: Union[str, None]
    gene_id: Union[str, None]
    gene_pheno: Union[int, None]
    gene_symbol: Union[str, None]
    gene_symbol_source: Union[str, None]
    hgnc_id: Union[str, None]
    hgvsc: Union[str, None]
    hgvsp: Union[str, None]
    hgvs_offset: Union[int, None]
    impact: Union[str, None]
    intron: Union[str, None]
    lof: Union[str, None]
    lof_flags: Union[str, None]
    lof_filter: Union[str, None]
    lof_info: Union[str, None]
    mane_select: Union[str, None]
    mane_plus_clinical: Union[str, None]
    mirna: Union[List[str], None]
    protein_end: Union[int, None]
    protein_start: Union[int, None]
    protein_id: Union[str, None]
    source: Union[str, None]
    strand: Union[int, None]
    transcript_id: Union[str, None]
    tsl: Union[int, None]
    uniprot_isoform: Union[List[str], None]
    variant_allele: Union[str, None]


@attr.define
class Vep:
    allele_string: Union[str, None]
    end: Union[int, None]
    id: Union[str, None]
    input: Union[str, None]
    intergenic_consequences: Union[List[Consequence], None]
    most_severe_consequence: Union[str, None]
    motif_feature_consequences: Union[List[Consequence], None]
    regulatory_feature_consequences: Union[List[Consequence], None]
    seq_region_name: Union[str, None]
    start: Union[int, None]
    strand: Union[int, None]
    transcript_consequences: List[TranscriptConsequence]
    variant_class: Union[str, None]


@attr.define
class RegionFlagsGenomes:
    lcr: bool
    segdup: bool
    non_par: bool


@attr.define
class RegionFlagsExomes:
    lcr: bool
    segdup: bool
    non_par: bool
    fail_interval_qc: bool
    outside_ukb_capture_region: bool
    outside_broad_capture_region: bool


@attr.define
class AlleleInfo:
    variant_type: str
    allele_type: str
    n_alt_alleles: int
    was_mixed: bool
    has_star: Optional[bool] = None


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
    age_hist_het: Histogram


@attr.define
class Histograms:
    qual_hists: QualHistograms
    raw_qual_hists: QualHistograms
    age_hists: AgeHistograms


@attr.define
class CaddPredictor:
    phred: float
    raw_score: float


@attr.define
class InSilicoPredictors:
    cadd: CaddPredictor
    revel_max: Union[float, None]
    spliceai_ds_max: Union[float, None]
    pangolin_largest_ds: Union[float, None]
    phylop: float
    sift_max: Union[float, None]
    polyphen_max: Union[float, None]


@attr.define
class InitialVariant:
    locus: Locus
    alleles: List[str]
    freq: List[Frequency]

    # grpmax: Grpmax
    # faf: List[Union[Faf, None]]
    # fafmax: Optional[FafMax]
    # joint_freq: List[Frequency]
    # joint_grpmax: Union[Grpmax, None]
    # joint_faf: Union[List[Union[Faf, None]], None]
    # joint_fafmax: Union[FafMax, None]
    #

    # grpmax: Any
    fafmax: Any
    joint_freq: Any
    joint_grpmax: Any
    joint_faf: Any
    joint_fafmax: Any

    a_index: int
    was_split: bool
    rsid: Union[Set[str], None]
    filters: Set[str]
    info: Info
    vep: Union[Vep, None]
    region_flags: Union[RegionFlagsGenomes, RegionFlagsExomes]
    allele_info: AlleleInfo
    histograms: Histograms
    in_silico_predictors: InSilicoPredictors

    grpmax: Optional[Any] = None
    faf: Optional[Any] = None

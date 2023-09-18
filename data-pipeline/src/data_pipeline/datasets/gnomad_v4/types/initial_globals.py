import attr
from typing import List, Dict, Tuple


@attr.define
class FilteringModelFeature:
    a_index: int
    n_alt_alleles: int
    AS_pab_max: float
    AS_MQRankSum: float
    AS_SOR: float
    AS_ReadPosRankSum: float


@attr.define
class FeatureMedians:
    key: List[str]
    value: FilteringModelFeature


@attr.define
class TestResult:
    rf_prediction: str
    rf_label: str
    n: int


@attr.define
class Cutoff:
    bin: float
    min_score: float


@attr.define
class MetaString:
    key: str
    value: str


@attr.define
class MetaInt:
    key: str
    value: int


@attr.define
class MetaFloat:
    key: List[str]
    value: float


@attr.define
class FilteringModel:
    model_name: str
    score_name: str
    feature_medians: List[FeatureMedians]
    variants_by_strata: List[MetaFloat]
    features_importance: List[MetaFloat]
    features: List[str]
    test_results: List[TestResult]
    rf_snv_cutoff: Cutoff
    rf_indel_cutoff: Cutoff
    inbreeding_cutoff: float
    model_id: str


@attr.define
class ToolVersions:
    dbsnp_version: str
    cadd_version: str
    revel_version: str
    splicaai_version: str
    primateai_version: str
    pangolin_version: str
    vrs_version: str


@attr.define
class VepGlobals:
    vep_version: str
    vep_csq_header: str
    vep_help: str
    vep_config: str


@attr.define
class AgeDistribution:
    bin_edges: List[float]
    bin_freq: List[int]
    n_smaller: int
    n_larger: int


@attr.define
class Globals:
    freq_meta: List[List[MetaString]]
    freq_index_dict: List[MetaInt]
    faf_meta: List[List[MetaString]]
    faf_index_dict: List[MetaInt]
    freq_sample_count: List[int]
    filtering_model: FilteringModel
    tool_versions: ToolVersions
    vep_globals: VepGlobals
    age_distribution: AgeDistribution
    age_index_dict: List[MetaInt]
    age_meta: List[List[MetaString]]
    grpmax_index_dict: List[MetaInt]
    grpmax_meta: List[List[MetaString]]
    README: List[MetaString]
    gnomad_qc_repo: str
    gnomad_methods_repo: str

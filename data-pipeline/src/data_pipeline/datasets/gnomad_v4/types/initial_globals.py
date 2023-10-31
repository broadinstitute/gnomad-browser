import attr
from typing import List, Optional


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
    filter_name: str
    score_name: str
    snv_cutoff: Cutoff
    indel_cutoff: Cutoff
    snv_training_variables: List[str]
    indel_training_variables: List[str]


@attr.define
class ToolVersions:
    dbsnp_version: str
    cadd_version: str
    revel_version: str
    spliceai_version: str
    pangolin_version: List[str]
    phylop_version: str
    sift_version: str
    polyphen_version: str


@attr.define
class VepGlobals:
    vep_version: str
    vep_help: str
    vep_config: str
    gencode_version: str
    mane_select_version: str


@attr.define
class AgeDistribution:
    bin_edges: List[float]
    bin_freq: List[int]
    n_smaller: int
    n_larger: int


@attr.define
class Downsampling:
    key: str
    value: List[int]


@attr.define
class VrsVersions:
    vrs_schema_version: str
    vrs_python_version: str
    seqrepo_version: str


@attr.define
class Globals:
    freq_meta: List[List[MetaString]]
    freq_index_dict: List[MetaInt]
    freq_meta_sample_count: List[int]
    faf_meta: List[List[MetaString]]
    faf_index_dict: List[MetaInt]
    downsamplings: Optional[Downsampling]
    filtering_model: FilteringModel
    tool_versions: ToolVersions
    vep_globals: VepGlobals
    age_distribution: AgeDistribution
    joint_freq_index_dict: List[MetaInt]
    joint_freq_meta_sample_count: List[int]
    joint_faf_meta: List[List[MetaString]]
    inbreeding_coeff_cutoff: float
    vrs_versions: VrsVersions
    date: str
    version: str

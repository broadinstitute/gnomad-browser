from typing import List, Union, Set
import attr

from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step1 import ColocatedVariants, Gnomad

from data_pipeline.datasets.gnomad_v4.types.initial_variant import (
    InSilicoPredictors,
    # Domain,
    # Grpmax,
    Locus,
)


@attr.define
class TranscriptConsequence:
    biotype: Union[str, None]
    consequence_terms: list[str]
    # domains: Union[List[Domain], None]
    domains: Union[List[str], None]
    gene_id: Union[str, None]
    gene_symbol: Union[str, None]
    hgvsc: Union[str, None]
    hgvsp: Union[str, None]
    is_canonical: bool
    lof: Union[str, None]
    lof_flags: Union[str, None]
    lof_filter: Union[str, None]
    # lof_info: Union[str, None]
    major_consequence: str
    # polyphen_prediction: Union[str, None]
    # sift_prediction: Union[str, None]
    transcript_id: Union[str, None]
    transcript_version: Union[str, None]
    transcript_id: Union[str, None]
    gene_version: str
    is_mane_select: bool
    is_mane_select_version: bool
    refseq_id: str
    refseq_version: str


@attr.define
class Variant:
    locus: Locus
    alleles: list[str]
    # grpmax: List[Grpmax]
    rsids: Union[Set[str], None]
    in_silico_predictors: InSilicoPredictors
    variant_id: str
    colocated_variants: ColocatedVariants
    exome: Gnomad
    genome: Gnomad
    subsets: set[str]
    flags: set[str]
    transcript_consequences: Union[List[TranscriptConsequence], None]

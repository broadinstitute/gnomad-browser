from .annotate_variants import annotate_variants, annotate_caids, annotate_vrs_ids
from .transcript_consequence.annotate_transcript_consequences import annotate_transcript_consequences
from .variant_id import variant_id, variant_ids, compressed_variant_id

__all__ = [
    "annotate_variants",
    "annotate_transcript_consequences",
    "annotate_caids",
    "variant_id",
    "variant_ids",
    "compressed_variant_id",
    "annotate_vrs_ids",
]

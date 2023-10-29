from .annotate_variants import annotate_variants
from .transcript_consequence.annotate_transcript_consequences import annotate_transcript_consequences
from .variant_id import variant_id, variant_ids, compressed_variant_id

__all__ = [
    "annotate_variants",
    "annotate_transcript_consequences",
    "variant_id",
    "variant_ids",
    "compressed_variant_id",
]

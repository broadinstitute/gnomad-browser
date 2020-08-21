import hail as hl

from ..parameters.types import ReferenceGenome
from ..sources import GRCH37_TRANSCRIPTS, GRCH38_TRANSCRIPTS


TRANSCRIPT_SOURCES = {
    "GRCh37": GRCH37_TRANSCRIPTS,
    "GRCh38": GRCH38_TRANSCRIPTS,
}


def get_transcript_by_id(transcript_id: str, reference_genome: ReferenceGenome):
    ds = hl.read_table(TRANSCRIPT_SOURCES[reference_genome])
    ds = ds.filter(ds.transcript_id == transcript_id)
    transcript = ds.collect()

    if not transcript:
        return None

    return transcript[0]

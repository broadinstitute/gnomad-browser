import hail as hl

def get_transcript_by_id(ds: hl.Table, transcript_id: str):
    ds = ds.filter(ds.transcript_id == transcript_id)
    transcript = ds.collect()

    if not transcript:
        return None

    return transcript[0]

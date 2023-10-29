from datetime import datetime


def generate_iso_timestamp_for_filename():
    now = datetime.utcnow()
    timestamp = now.strftime("%Y%m%dT%H%M%S%Z")
    return timestamp

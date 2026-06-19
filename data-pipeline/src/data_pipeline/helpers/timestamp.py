from datetime import datetime


def generate_iso_timestamp_for_filename():
    now = datetime.utcnow()
    return now.strftime("%Y%m%dT%H%M%S%Z")

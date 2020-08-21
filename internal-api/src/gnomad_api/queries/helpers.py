import json
import os
import tempfile
from typing import List, Dict, Any

import hail as hl

from ..settings import COLLECT_TEMP_DIR


def collect(ds: hl.Table) -> List[Dict[str, Any]]:
    with tempfile.NamedTemporaryFile(prefix="export-", dir=COLLECT_TEMP_DIR, suffix=".tsv") as export_file:
        ds.select(value=hl.json(ds.row)).key_by().select("value").export(export_file.name, header=False)

        directory, filename = os.path.split(export_file.name)
        os.remove(os.path.join(directory, f".{filename}.crc"))

        with open(export_file.name) as f:
            variants = [json.loads(line) for line in f]
            return variants

from typing import List
from cattrs import structure, transform_error
from data_pipeline.datasets.gnomad_v4.types.initial_variant import InitialVariant
import hail as hl
import json
from loguru import logger

from data_pipeline.datasets.gnomad_v4.types.initial_globals import Globals


def ht_to_json(ht: hl.Table, field: str = "row"):
    if field == "row":
        ht = ht.select(data=hl.json(ht.row))
    elif field == "globals":
        ht = ht.select(data=hl.json(ht.globals))
    elif field:
        ht = ht.select(data=hl.json(ht[field]))
    else:
        ht = ht.select(data=hl.json(ht.row))

    data = ht.collect()
    objs = [json.loads(g.data) for g in data]

    return objs


def test_globals_input_validation():
    ht = hl.read_table("./data/mock_v4_release.ht")
    result = ht_to_json(ht, "globals")[0]
    logger.info(result)
    structure(result, Globals)


def test_variant_input_validation():
    ht = hl.read_table("./data/mock_v4_release.ht")
    # ht = ht.sample(0.1, seed=1234)
    result = ht_to_json(ht)
    structure(result, List[InitialVariant])

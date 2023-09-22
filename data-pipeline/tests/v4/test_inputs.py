from cattrs import structure, structure_attrs_fromdict
import hail as hl
import json
from loguru import logger

from data_pipeline.pipelines.gnomad_v4_variants import (
    pipeline as gnomad_v4_variant_pipeline,
)

from data_pipeline.datasets.gnomad_v4.types.initial_globals import Globals
from data_pipeline.datasets.gnomad_v4.types.initial_variant import InitialVariant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step1 import Variant as Step1Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step2 import Variant as Step2Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step3 import Variant as Step3Variant

step1_task = gnomad_v4_variant_pipeline.get_task("prepare_gnomad_v4_exome_variants")


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
    input_path = gnomad_v4_variant_pipeline.get_task("prepare_gnomad_v4_exome_variants").get_inputs()["input_path"]
    ht = hl.read_table(input_path)
    result = ht_to_json(ht, "globals")[0]
    logger.info(result)
    structure(result, Globals)


def test_validate_variant_input():
    input_path = gnomad_v4_variant_pipeline.get_task("prepare_gnomad_v4_exome_variants").get_inputs()["input_path"]
    ht = hl.read_table(input_path)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, InitialVariant) for variant in result]


def test_validate_step1_output():
    output_path = gnomad_v4_variant_pipeline.get_task("prepare_gnomad_v4_exome_variants").get_output_path()
    ht = hl.read_table(output_path)
    # ht = ht.sample(0.1, seed=1234)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step1Variant) for variant in result]


def test_validate_step2_output():
    output_path = gnomad_v4_variant_pipeline.get_task("annotate_gnomad_v4_exome_variants").get_output_path()
    ht = hl.read_table(output_path)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step2Variant) for variant in result]


def test_validate_step3_output():
    output_path = gnomad_v4_variant_pipeline.get_task(
        "annotate_gnomad_v4_exome_transcript_consequences"
    ).get_output_path()
    ht = hl.read_table(output_path)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step3Variant) for variant in result]

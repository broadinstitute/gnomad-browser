from cattrs import structure, structure_attrs_fromdict
import hail as hl
import json

from loguru import logger

from data_pipeline.pipeline import Pipeline

from data_pipeline.datasets.gnomad_v4.types.initial_globals import Globals
from data_pipeline.datasets.gnomad_v4.types.initial_variant import InitialVariant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step1 import Variant as Step1Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step2 import Variant as Step2Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step3 import Variant as Step3Variant


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


def validate_globals_input(pipeline: Pipeline):
    input_path = pipeline.get_task("prepare_gnomad_v4_exome_variants").get_inputs()["input_path"]
    ht = hl.read_table(input_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht, "globals")[0]
    # logger.info(result)
    structure(result, Globals)
    logger.info("Validated prepare_gnomad_v4_exome_variants input globals")


def validate_variant_input(pipeline: Pipeline):
    input_path = pipeline.get_task("prepare_gnomad_v4_exome_variants").get_inputs()["input_path"]
    ht = hl.read_table(input_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, InitialVariant) for variant in result]
    logger.info("Validated prepare_gnomad_v4_exome_variants input variants")


def validate_step1_output(pipeline: Pipeline):
    output_path = pipeline.get_task("prepare_gnomad_v4_exome_variants").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step1Variant) for variant in result]
    logger.info("Validated prepare_gnomad_v4_exome_variants (step 1) output")


def validate_step2_output(pipeline: Pipeline):
    output_path = pipeline.get_task("annotate_gnomad_v4_exome_variants").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step2Variant) for variant in result]
    logger.info("Validated annotate_gnomad_v4_exome_variants (step 2) output")


def validate_step3_output(pipeline: Pipeline):
    output_path = pipeline.get_task("annotate_gnomad_v4_exome_transcript_consequences").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht)
    [structure_attrs_fromdict(variant, Step3Variant) for variant in result]
    logger.info("Validated annotate_gnomad_v4_exome_transcript_consequences (step 3) output")

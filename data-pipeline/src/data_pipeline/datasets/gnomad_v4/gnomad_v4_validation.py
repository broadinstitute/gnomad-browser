from cattrs import (
    ClassValidationError,
    IterableValidationError,
    # IterableValidationError,
    structure,
    Converter,
    transform_error,
)
import hail as hl
import json

from loguru import logger

from data_pipeline.pipeline import Pipeline

from data_pipeline.datasets.gnomad_v4.types.initial_globals import Globals
from data_pipeline.datasets.gnomad_v4.types.initial_variant import InitialVariant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step1 import Variant as Step1Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step2 import Variant as Step2Variant
from data_pipeline.datasets.gnomad_v4.types.prepare_variants_step3 import Variant as Step3Variant

c = Converter(forbid_extra_keys=True)


def validate_rows(ht: hl.Table, cls: object):
    result = ht_to_json(ht)

    for variant in result:
        if variant:
            try:
                c.structure_attrs_fromdict(variant, cls)
            except ClassValidationError as e:
                logger.error(e)
                logger.error(transform_error(e))
                # raise Exception(e)
            except IterableValidationError as e:
                logger.error(e)
                logger.error(transform_error(e))
                raise Exception(e)
            except Exception as e:
                logger.info(variant["exome"])
                logger.info(variant["genome"])
                logger.error(e)
                logger.error(transform_error(e))
                raise Exception(e)


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
    input_path = pipeline.get_task("prepare_gnomad_v4_variants").get_inputs()["exome_variants_path"]
    ht = hl.read_table(input_path)
    ht = ht.sample(0.001, 1337)
    result = ht_to_json(ht, "globals")[0]
    # logger.info(result)
    structure(result, Globals)
    logger.info("Validated prepare_gnomad_v4_variants input globals")


def validate_variant_input(pipeline: Pipeline):
    input_path = pipeline.get_task("prepare_gnomad_v4_variants").get_inputs()["exome_variants_path"]
    ht = hl.read_table(input_path)
    ht = ht.sample(0.001, 1337)
    validate_rows(ht, InitialVariant)
    logger.info("Validated prepare_gnomad_v4_variants input variants")


def validate_step1_output(pipeline: Pipeline):
    output_path = pipeline.get_task("prepare_gnomad_v4_variants").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    validate_rows(ht, Step1Variant)
    logger.info("Validated prepare_gnomad_v4_variants (step 1) output")


def validate_step2_output(pipeline: Pipeline):
    output_path = pipeline.get_task("annotate_gnomad_v4_variants").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    validate_rows(ht, Step2Variant)
    logger.info("Validated annotate_gnomad_v4_variants (step 2) output")


def validate_step3_output(pipeline: Pipeline):
    output_path = pipeline.get_task("annotate_gnomad_v4_transcript_consequences").get_output_path()
    ht = hl.read_table(output_path)
    ht = ht.sample(0.001, 1337)
    validate_rows(ht, Step3Variant)
    logger.info("Validated annotate_gnomad_v4_transcript_consequences (step 3) output")

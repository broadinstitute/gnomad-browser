from aiohttp import web

import hail as hl

from . import settings
from .exceptions import exception_handler_middleware
from .routes import routes
from .sources import (
    GRCH37_TRANSCRIPTS, GRCH38_TRANSCRIPTS,
    GRCH37_GENES, GRCH38_GENES,
    RSID_INDEX,
    GNOMAD_V3_GENOME_COVERAGE,
    GNOMAD_V3_GENE_FEATURE_COVERAGE,
    GNOMAD_V3_TRANSCRIPT_FEATURE_COVERAGE,
    GNOMAD_V2_EXOME_COVERAGE,
    GNOMAD_V2_GENOME_COVERAGE,
    GNOMAD_V2_GENE_FEATURE_COVERAGE,
    GNOMAD_V2_TRANSCRIPT_FEATURE_COVERAGE,
    EXAC_EXOME_COVERAGE,
    EXAC_GENE_FEATURE_COVERAGE,
    EXAC_TRANSCRIPT_FEATURE_COVERAGE)

async def init_app(*args) -> web.Application:  # pylint: disable=unused-argument
    hl.init(
        local=f"local[{settings.HAIL_N_CPUS}]",
        log=settings.HAIL_LOG_PATH,
        quiet=not settings.DEBUG,
        spark_conf=settings.HAIL_SPARK_CONF,
    )

    app = web.Application(
        debug=settings.DEBUG,
        handler_args={"max_line_size": 32768},  # max_line_size is needed to support URLs with long lists of intervals
        middlewares=[exception_handler_middleware],
    )
    app.add_routes(routes)

    transcript_sources = {
        "GRCh37": GRCH37_TRANSCRIPTS,
        "GRCh38": GRCH38_TRANSCRIPTS,
    }
    app["transcript_tables"] = {
        reference_genome: hl.read_table(transcript_source)
        for reference_genome, transcript_source in transcript_sources.items()
    }

    gene_sources = {
        "GRCh37": GRCH37_GENES,
        "GRCh38": GRCH38_GENES,
    }
    app["gene_tables"] = {
        reference_genome: hl.read_table(gene_source)
        for reference_genome, gene_source in gene_sources.items()
    }

    app["rsid_index"] = hl.read_table(RSID_INDEX)

    gene_feature_coverage_tables = {
        "gnomad_r3": GNOMAD_V3_GENE_FEATURE_COVERAGE,
        "gnomad_r2_1": GNOMAD_V2_GENE_FEATURE_COVERAGE,
        "exac": EXAC_GENE_FEATURE_COVERAGE,
    }
    app["gene_feature_coverage"] = {
        dataset: hl.read_table(table)
        for dataset, table in gene_feature_coverage_tables.items()
    }

    exome_coverage_tables = {
        "gnomad_r2_1": GNOMAD_V2_EXOME_COVERAGE,
        "exac": EXAC_EXOME_COVERAGE,
    }
    app["exome_coverage"] = {
        dataset: hl.read_table(table)
        for dataset, table in exome_coverage_tables.items()
    }

    genome_coverage_tables = {
        "gnomad_r2_1": GNOMAD_V2_GENOME_COVERAGE,
        "gnomad_r3": GNOMAD_V3_GENOME_COVERAGE,
    }
    app["genome_coverage"] = {
        dataset: hl.read_table(table)
        for dataset, table in genome_coverage_tables.items()
    }

    transcript_feature_coverage_tables = {
        "gnomad_r3": GNOMAD_V3_TRANSCRIPT_FEATURE_COVERAGE,
        "gnomad_r2_1": GNOMAD_V2_TRANSCRIPT_FEATURE_COVERAGE,
        "exac": EXAC_TRANSCRIPT_FEATURE_COVERAGE,
    }
    app["transcript_feature_coverage"] = {
        dataset: hl.read_table(table)
        for dataset, table in transcript_feature_coverage_tables.items()
    }

    return app

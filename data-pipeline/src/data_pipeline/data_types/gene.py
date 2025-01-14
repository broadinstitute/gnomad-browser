import hail as hl

from .locus import normalized_contig, x_position


def merge_overlapping_exons(regions):
    return hl.if_else(
        hl.len(regions) > 1,
        hl.rbind(
            hl.sorted(regions, lambda region: region.start),
            lambda sorted_regions: sorted_regions[1:].fold(
                lambda acc, region: hl.if_else(
                    region.start <= acc[-1].stop + 1,
                    acc[:-1].append(
                        acc[-1].annotate(
                            stop=hl.max(region.stop, acc[-1].stop), xstop=hl.max(region.xstop, acc[-1].xstop)
                        )
                    ),
                    acc.append(region),
                ),
                [sorted_regions[0]],
            ),
        ),
        regions,
    )


###############################################
# Exons                                       #
###############################################


def get_exons(gencode):
    """
    Filter GENCODE table to exons and format fields.
    """
    exons = gencode.filter(hl.set(["exon", "CDS", "UTR"]).contains(gencode.feature))
    exons = exons.select(
        feature_type=exons.feature,
        transcript_id=exons.transcript_id.split("\\.")[0],
        transcript_version=exons.transcript_id.split("\\.")[1],
        gene_id=exons.gene_id.split("\\.")[0],
        gene_version=exons.gene_id.split("\\.")[1],
        chrom=normalized_contig(exons.interval.start.contig),
        strand=exons.strand,
        start=exons.interval.start.position,
        stop=exons.interval.end.position,
        xstart=x_position(exons.interval.start),
        xstop=x_position(exons.interval.end),
    )

    return exons


###############################################
# Genes                                       #
###############################################


def get_genes(gencode):
    """
    Filter GENCODE table to genes and format fields.
    """
    genes = gencode.filter(gencode.feature == "gene")
    genes = genes.select(
        gene_id=genes.gene_id.split("\\.")[0],
        gene_version=genes.gene_id.split("\\.")[1],
        gencode_symbol=genes.gene_name,
        chrom=normalized_contig(genes.interval.start.contig),
        strand=genes.strand,
        start=genes.interval.start.position,
        stop=genes.interval.end.position,
        xstart=x_position(genes.interval.start),
        xstop=x_position(genes.interval.end),
    )

    genes = genes.annotate()

    genes = genes.key_by(genes.gene_id)

    return genes


def collect_gene_exons(gene_exons):
    # There are 3 feature types in the exons collection: "CDS", "UTR", and "exon".
    # There are "exon" regions that cover the "CDS" and "UTR" regions and also
    # some (non-coding) transcripts that contain only "exon" regions.
    # This filters the "exon" regions to only those that are in non-coding transcripts.
    #
    # This makes the UI for selecting visible regions easier, since it can filter
    # on "CDS" or "UTR" feature type without having to also filter out the "exon" regions
    # that duplicate the "CDS" and "UTR" regions.

    non_coding_transcript_exons = hl.bind(
        lambda coding_transcripts: gene_exons.filter(lambda exon: ~coding_transcripts.contains(exon.transcript_id)),
        hl.set(
            gene_exons.filter(lambda exon: (exon.feature_type == "CDS") | (exon.feature_type == "UTR")).map(
                lambda exon: exon.transcript_id
            )
        ),
    )

    exons = (
        merge_overlapping_exons(gene_exons.filter(lambda exon: exon.feature_type == "CDS"))
        .extend(merge_overlapping_exons(gene_exons.filter(lambda exon: exon.feature_type == "UTR")))
        .extend(merge_overlapping_exons(non_coding_transcript_exons))
    )

    exons = exons.map(lambda exon: exon.select("feature_type", "start", "stop", "xstart", "xstop"))

    return exons


def reject_par_y_genes(genes_path=None):
    genes = hl.read_table(genes_path)
    genes = genes.filter(genes.gene_version.endswith("_PAR_Y") == hl.literal(False))
    return genes


###############################################
# Transcripts                                 #
###############################################


def get_transcripts(gencode):
    """
    Filter GENCODE table to transcripts and format fields.
    """
    transcripts = gencode.filter(gencode.feature == "transcript")
    transcripts = transcripts.select(
        transcript_id=transcripts.transcript_id.split("\\.")[0],
        transcript_version=transcripts.transcript_id.split("\\.")[1],
        gene_id=transcripts.gene_id.split("\\.")[0],
        gene_version=transcripts.gene_id.split("\\.")[1],
        chrom=normalized_contig(transcripts.interval.start.contig),
        strand=transcripts.strand,
        start=transcripts.interval.start.position,
        stop=transcripts.interval.end.position,
        xstart=x_position(transcripts.interval.start),
        xstop=x_position(transcripts.interval.end),
    )

    transcripts = transcripts.key_by(transcripts.transcript_id)

    return transcripts


def collect_transcript_exons(transcript_exons):
    # There are 3 feature types in the exons collection: "CDS", "UTR", and "exon".
    # There are "exon" regions that cover the "CDS" and "UTR" regions and also
    # some (non-coding) transcripts that contain only "exon" regions.
    # This filters the "exon" regions to only those that are in non-coding transcripts.
    #
    # This makes the UI for selecting visible regions easier, since it can filter
    # on "CDS" or "UTR" feature type without having to also filter out the "exon" regions
    # that duplicate the "CDS" and "UTR" regions.

    is_coding = transcript_exons.any(lambda exon: (exon.feature_type == "CDS") | (exon.feature_type == "UTR"))

    exons = hl.if_else(is_coding, transcript_exons.filter(lambda exon: exon.feature_type != "exon"), transcript_exons)

    exons = exons.map(lambda exon: exon.select("feature_type", "start", "stop", "xstart", "xstop"))

    return exons


###############################################
# Main                                        #
###############################################


def import_gencode(path, reference_genome):
    gencode = hl.experimental.import_gtf(path, force=True, reference_genome=reference_genome)
    gencode = gencode.repartition(2000, shuffle=True)
    gencode = gencode.cache()

    # Extract genes and transcripts
    genes = get_genes(gencode)
    transcripts = get_transcripts(gencode)

    # Annotate genes/transcripts with their exons
    exons = get_exons(gencode)
    exons = exons.cache()

    gene_exons = exons.group_by(exons.gene_id, exons.gene_version).aggregate(exons=hl.agg.collect(exons.row_value))
    genes = genes.annotate(exons=collect_gene_exons(gene_exons[genes.gene_id, genes.gene_version].exons))

    transcript_exons = exons.group_by(exons.transcript_id, exons.transcript_version).aggregate(
        exons=hl.agg.collect(exons.row_value)
    )
    transcripts = transcripts.annotate(
        exons=collect_transcript_exons(
            transcript_exons[transcripts.transcript_id, transcripts.transcript_version].exons
        )
    )

    # Annotate genes with their transcripts
    gene_transcripts = transcripts.key_by()
    gene_transcripts = gene_transcripts.group_by(gene_transcripts.gene_id, gene_transcripts.gene_version).aggregate(
        transcripts=hl.agg.collect(gene_transcripts.row_value)
    )
    genes = genes.annotate(transcripts=gene_transcripts[genes.gene_id, genes.gene_version].transcripts)

    return genes


def import_hgnc(path):
    ds = hl.import_table(path, missing="")

    ds = ds.select(
        hgnc_id=ds["HGNC ID"],
        symbol=ds["Approved symbol"],
        name=ds["Approved name"],
        previous_symbols=ds["Previous symbols"],
        alias_symbols=ds["Alias symbols"],
        omim_id=ds["OMIM ID(supplied by OMIM)"],
        ensembl_id=hl.or_else(ds["Ensembl gene ID"], ds["Ensembl ID(supplied by Ensembl)"]),
        ncbi_id=hl.or_else(ds["NCBI Gene ID"], ds["NCBI Gene ID(supplied by NCBI)"]),
    )

    ds = ds.annotate(
        previous_symbols=hl.set(ds.previous_symbols.split(",").map(lambda s: s.strip())),
        alias_symbols=hl.set(ds.alias_symbols.split(",").map(lambda s: s.strip())),
    )

    return ds


def prepare_gene_table_for_release(genes_path, keep_mane_version_global_annotation):
    ds = hl.read_table(genes_path)
    if keep_mane_version_global_annotation:
        globals_dict = ds.index_globals()
        ds = ds.select_globals(mane_select_version=globals_dict["annotations"]["mane_select_transcript"]["version"])
    else:
        ds = ds.select_globals()

    ds = ds.repartition(100)
    return ds


def prepare_genes(gencode_path, hgnc_path, reference_genome):
    genes = import_gencode(gencode_path, reference_genome)

    hgnc = import_hgnc(hgnc_path)
    hgnc = hgnc.filter(hl.is_defined(hgnc.ensembl_id)).key_by("ensembl_id")
    genes = genes.annotate(**hgnc[genes.gene_id])
    # If a symbol was not present in HGNC data, use the symbol from GENCODE
    genes = genes.annotate(symbol=hl.or_else(genes.symbol, genes.gencode_symbol))

    genes = genes.annotate(
        symbol_upper_case=genes.symbol.upper(),
        search_terms=hl.empty_set(hl.tstr)
        .add(genes.symbol)
        .add(genes.gencode_symbol)
        .union(genes.previous_symbols)
        .union(genes.alias_symbols)
        .map(lambda s: s.upper()),
    )

    genes = genes.annotate(
        reference_genome=reference_genome,
        transcripts=genes.transcripts.map(lambda transcript: transcript.annotate(reference_genome=reference_genome)),
    )

    chip_genes = {"ENSG00000171456", "ENSG00000119772", "ENSG00000168769"}
    genes = genes.annotate(
        flags=hl.set([hl.or_missing(hl.set(chip_genes).contains(genes.gene_id), "chip")]).filter(hl.is_defined)
    )

    return genes

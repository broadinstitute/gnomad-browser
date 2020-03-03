import argparse

import hail as hl

from data_utils.regions import merge_overlapping_regions


def xpos(contig_str, position):
    contig_number = (
        hl.case()
        .when(contig_str == "X", 23)
        .when(contig_str == "Y", 24)
        .when(contig_str[0] == "M", 25)
        .default(hl.int(contig_str))
    )

    return hl.int64(contig_number) * 1_000_000_000 + position


###############################################
# Exons                                       #
###############################################


def get_exons(gencode):
    """
    Filter Gencode table to exons and format fields.
    """
    exons = gencode.filter(hl.set(["exon", "CDS", "UTR"]).contains(gencode.feature))
    exons = exons.select(
        feature_type=exons.feature,
        transcript_id=exons.transcript_id.split("\\.")[0],
        gene_id=exons.gene_id.split("\\.")[0],
        chrom=exons.interval.start.seqname[3:],
        strand=exons.strand,
        start=exons.interval.start.position,
        stop=exons.interval.end.position,
    )

    return exons


###############################################
# Genes                                       #
###############################################


def get_genes(gencode):
    """
    Filter Gencode table to genes and format fields.
    """
    genes = gencode.filter(gencode.feature == "gene")
    genes = genes.select(
        gene_id=genes.gene_id.split("\\.")[0],
        gene_symbol=genes.gene_name,
        chrom=genes.interval.start.seqname[3:],
        strand=genes.strand,
        start=genes.interval.start.position,
        stop=genes.interval.end.position,
    )

    genes = genes.annotate(xstart=xpos(genes.chrom, genes.start), xstop=xpos(genes.chrom, genes.stop))

    genes = genes.key_by(genes.gene_id).drop("interval")

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
        merge_overlapping_regions(gene_exons.filter(lambda exon: exon.feature_type == "CDS"))
        .extend(merge_overlapping_regions(gene_exons.filter(lambda exon: exon.feature_type == "UTR")))
        .extend(merge_overlapping_regions(non_coding_transcript_exons))
    )

    exons = exons.map(
        lambda exon: exon.select(
            "feature_type", "start", "stop", xstart=xpos(exon.chrom, exon.start), xstop=xpos(exon.chrom, exon.stop)
        )
    )

    return exons


###############################################
# Transcripts                                 #
###############################################


def get_transcripts(gencode):
    """
    Filter Gencode table to transcripts and format fields.
    """
    transcripts = gencode.filter(gencode.feature == "transcript")
    transcripts = transcripts.select(
        transcript_id=transcripts.transcript_id.split("\\.")[0],
        gene_id=transcripts.gene_id.split("\\.")[0],
        chrom=transcripts.interval.start.seqname[3:],
        strand=transcripts.strand,
        start=transcripts.interval.start.position,
        stop=transcripts.interval.end.position,
    )

    transcripts = transcripts.annotate(
        xstart=xpos(transcripts.chrom, transcripts.start), xstop=xpos(transcripts.chrom, transcripts.stop)
    )

    transcripts = transcripts.key_by(transcripts.transcript_id).drop("interval")

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

    exons = hl.cond(is_coding, transcript_exons.filter(lambda exon: exon.feature_type != "exon"), transcript_exons)

    exons = exons.map(
        lambda exon: exon.select(
            "feature_type", "start", "stop", xstart=xpos(exon.chrom, exon.start), xstop=xpos(exon.chrom, exon.stop)
        )
    )

    return exons


###############################################
# Main                                        #
###############################################


def load_gencode_gene_models(gtf_path, min_partitions=32):
    gencode = hl.experimental.import_gtf(gtf_path, min_partitions=min_partitions)

    # Extract genes and transcripts
    genes = get_genes(gencode)
    transcripts = get_transcripts(gencode)

    # Annotate genes/transcripts with their exons
    exons = get_exons(gencode)
    exons = exons.cache()

    gene_exons = exons.group_by(exons.gene_id).aggregate(exons=hl.agg.collect(exons.row_value))
    genes = genes.annotate(exons=collect_gene_exons(gene_exons[genes.gene_id].exons))

    transcript_exons = exons.group_by(exons.transcript_id).aggregate(exons=hl.agg.collect(exons.row_value))

    transcripts = transcripts.annotate(
        exons=collect_transcript_exons(transcript_exons[transcripts.transcript_id].exons)
    )

    # Annotate genes with their transcripts
    gene_transcripts = transcripts.key_by()
    gene_transcripts = gene_transcripts.group_by(gene_transcripts.gene_id).aggregate(
        transcripts=hl.agg.collect(gene_transcripts.row_value)
    )
    genes = genes.annotate(**gene_transcripts[genes.gene_id])
    genes = genes.cache()

    return genes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--gencode",
        action="append",
        default=[],
        metavar=("version", "gtf_path", "canonical_transcripts_path"),
        nargs=3,
        required=True,
    )
    parser.add_argument("--hgnc")
    parser.add_argument("--min-partitions", type=int, default=32)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    genes = None

    all_gencode_versions = [gencode_version for gencode_version, _, _ in args.gencode]

    for gencode_version, gtf_path, canonical_transcripts_path in args.gencode:
        gencode_genes = load_gencode_gene_models(gtf_path, min_partitions=args.min_partitions)

        # Canonical transcripts file is a TSV with two columns: gene ID and transcript ID and no header row
        canonical_transcripts = hl.import_table(
            canonical_transcripts_path, key="gene_id", min_partitions=args.min_partitions
        )
        gencode_genes = gencode_genes.annotate(
            canonical_transcript_id=canonical_transcripts[gencode_genes.gene_id].transcript_id
        )

        gencode_genes = gencode_genes.select(**{f"v{gencode_version}": gencode_genes.row_value})

        if not genes:
            genes = gencode_genes
        else:
            genes = genes.join(gencode_genes, "outer")

    genes = genes.select(gencode=genes.row_value)

    hgnc = hl.import_table(args.hgnc)

    # Fix for alternative HGNC column name
    try:
        hgnc = hgnc.rename({'Alias symbols': 'Synonyms'})
    except:
        pass

    hgnc = hgnc.select(
        hgnc_id=hgnc["HGNC ID"],
        symbol=hgnc["Approved symbol"],
        name=hgnc["Approved name"],
        previous_symbols=hgnc["Previous symbols"],
        synonyms=hgnc["Synonyms"],
        omim_id=hgnc["OMIM ID(supplied by OMIM)"],
        gene_id=hgnc["Ensembl ID(supplied by Ensembl)"],
    )
    hgnc = hgnc.key_by("gene_id")
    hgnc = hgnc.annotate(
        previous_symbols=hl.cond(
            hgnc.previous_symbols == "",
            hl.empty_array(hl.tstr),
            hgnc.previous_symbols.split(",").map(lambda s: s.strip()),
        ),
        synonyms=hl.cond(
            hgnc.synonyms == "", hl.empty_array(hl.tstr), hgnc.synonyms.split(",").map(lambda s: s.strip())
        ),
    )

    genes = genes.annotate(**hgnc[genes.gene_id])
    genes = genes.annotate(symbol_source=hl.cond(hl.is_defined(genes.symbol), "hgnc", hl.null(hl.tstr)))

    # If an HGNC gene symbol was not present, use the symbol from Gencode
    for gencode_version in all_gencode_versions:
        genes = genes.annotate(
            symbol=hl.or_else(genes.symbol, genes.gencode[f"v{gencode_version}"].gene_symbol),
            symbol_source=hl.cond(
                hl.is_missing(genes.symbol) & hl.is_defined(genes.gencode[f"v{gencode_version}"].gene_symbol),
                f"gencode (v{gencode_version})",
                genes.symbol_source,
            ),
        )

    # Collect all fields that can be used to search by gene name
    genes = genes.annotate(
        symbol_upper_case=genes.symbol.upper(),
        search_terms=hl.empty_array(hl.tstr).append(genes.symbol).extend(genes.synonyms).extend(genes.previous_symbols),
    )
    for gencode_version in all_gencode_versions:
        genes = genes.annotate(
            search_terms=hl.rbind(
                genes.gencode[f"v{gencode_version}"].gene_symbol,
                lambda symbol_in_gencode: hl.cond(
                    hl.is_defined(symbol_in_gencode), genes.search_terms.append(symbol_in_gencode), genes.search_terms
                ),
            )
        )

    genes = genes.annotate(search_terms=hl.set(genes.search_terms.map(lambda s: s.upper())))

    genes.describe()

    genes.write(args.output, overwrite=True)


if __name__ == "__main__":
    main()

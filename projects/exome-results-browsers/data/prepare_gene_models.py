import argparse

import hail as hl


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
        start=exons.interval.start.position + 1,
        stop=exons.interval.end.position + 1,
    )

    return exons


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
        start=genes.interval.start.position + 1,
        stop=genes.interval.end.position + 1,
    )

    genes = genes.key_by(genes.gene_id).drop("interval")

    return genes


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
        start=transcripts.interval.start.position + 1,
        stop=transcripts.interval.end.position + 1,
    )

    transcripts = transcripts.key_by(transcripts.transcript_id).drop("interval")

    return transcripts


def load_gencode_gene_models(gtf_path, min_partitions=8):
    gencode = hl.experimental.import_gtf(gtf_path, min_partitions=min_partitions)

    # Extract genes, transcripts, and exons from the GTF file
    genes = get_genes(gencode)
    transcripts = get_transcripts(gencode)
    exons = get_exons(gencode)
    exons = exons.cache()

    # Annotate transcripts with their exons
    transcript_exons = exons.group_by(exons.transcript_id).aggregate(exons=hl.agg.collect(exons.row_value))
    transcripts = transcripts.annotate(
        exons=transcript_exons[transcripts.transcript_id].exons.map(
            lambda exon: exon.select("feature_type", "start", "stop")
        )
    )

    # Annotate genes with their transcripts
    gene_transcripts = transcripts.key_by()
    gene_transcripts = gene_transcripts.group_by(gene_transcripts.gene_id).aggregate(
        transcripts=hl.agg.collect(gene_transcripts.row_value)
    )
    genes = genes.annotate(**gene_transcripts[genes.gene_id])
    genes = genes.cache()

    return genes


def load_canonical_transcripts(canonical_transcripts_path, min_partitions=8):
    # Canonical transcripts file is a TSV with two columns: gene ID and transcript ID and no header row
    canonical_transcripts = hl.import_table(
        canonical_transcripts_path, force=True, no_header=True, min_partitions=min_partitions
    )
    canonical_transcripts = canonical_transcripts.rename({"f0": "gene_id", "f1": "transcript_id"})
    canonical_transcripts = canonical_transcripts.key_by("gene_id")
    return canonical_transcripts


def load_hgnc(hgnc_path, min_partitions=8):
    hgnc = hl.import_table(hgnc_path, min_partitions=min_partitions)
    hgnc = hgnc.select(
        hgnc_id=hgnc["HGNC ID"],
        symbol=hgnc["Approved symbol"],
        name=hgnc["Approved name"],
        previous_symbols=hgnc["Previous symbols"].split(",").map(lambda s: s.strip()),
        synonyms=hgnc["Synonyms"].split(",").map(lambda s: s.strip()),
        omim_id=hgnc["OMIM ID(supplied by OMIM)"],
        gene_id=hgnc["Ensembl ID(supplied by Ensembl)"],
    )
    hgnc = hgnc.key_by("gene_id")
    return hgnc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gencode")
    parser.add_argument("canonical_transcripts")
    parser.add_argument("hgnc")
    parser.add_argument("--min-partitions", type=int, default=8)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    # Load genes from GTF file
    genes = load_gencode_gene_models(args.gencode, min_partitions=args.min_partitions)
    genes = genes.transmute(gencode_gene_symbol=genes.gene_symbol)

    # Annotate genes with canonical transcript
    canonical_transcripts = load_canonical_transcripts(args.canonical_transcripts, min_partitions=args.min_partitions)
    genes = genes.annotate(canonical_transcript_id=canonical_transcripts[genes.gene_id].transcript_id)

    # Drop transcripts except for canonical
    genes = genes.annotate(
        canonical_transcript=genes.transcripts.filter(
            lambda transcript: transcript.transcript_id == genes.canonical_transcript_id
        ).head()
    )
    genes = genes.drop("transcripts")

    # Annotate genes with information from HGNC
    hgnc = load_hgnc(args.hgnc)
    genes = genes.annotate(**hgnc[genes.gene_id])
    genes = genes.annotate(symbol_source=hl.cond(hl.is_defined(genes.symbol), "hgnc", hl.null(hl.tstr)))
    genes = genes.annotate(
        symbol=hl.or_else(genes.symbol, genes.gencode_gene_symbol),
        symbol_source=hl.or_else(genes.symbol_source, "gencode"),
    )

    # Collect all fields that can be used to search by gene symbol
    genes = genes.annotate(
        symbol_upper_case=genes.symbol.upper(),
        search_terms=hl.set(
            hl.empty_array(hl.tstr)
            .append(genes.symbol)
            .extend(genes.synonyms)
            .extend(genes.previous_symbols)
            .append(genes.gencode_gene_symbol)
            .map(lambda s: s.upper())
        ),
    )

    genes.describe()

    genes.write(args.output, overwrite=True)


if __name__ == "__main__":
    main()

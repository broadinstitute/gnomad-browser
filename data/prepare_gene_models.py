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
        start=exons.interval.start.position + 1,
        stop=exons.interval.end.position + 1,
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
        gene_name=genes.gene_name,
        gene_name_upper=genes.gene_name.upper(),
        chrom=genes.interval.start.seqname[3:],
        strand=genes.strand,
        start=genes.interval.start.position + 1,
        stop=genes.interval.end.position + 1,
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
        start=transcripts.interval.start.position + 1,
        stop=transcripts.interval.end.position + 1,
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
# CLI                                         #
###############################################


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gencode")
    parser.add_argument("--canonical-transcripts")
    parser.add_argument("--omim-annotations")
    parser.add_argument("--dbnsfp-gene")
    parser.add_argument("--min-partitions", type=int, default=32)
    parser.add_argument("output")
    args = parser.parse_args()

    gencode = hl.experimental.import_gtf(args.gencode, min_partitions=args.min_partitions)

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

    # Annotate genes with information from supplementary files

    # Add canonical transcript IDs
    if args.canonical_transcripts:
        canonical_transcripts = (
            hl.import_table(args.canonical_transcripts, force=True, no_header=True, min_partitions=args.min_partitions)
            .rename({"f0": "gene_id", "f1": "canonical_transcript_id"})
            .key_by("gene_id")
        )
        genes = genes.annotate(**canonical_transcripts[genes.gene_id])

    # Add OMIM ID
    if args.omim_annotations:
        omim = (
            hl.import_table(args.omim_annotations, force=True, min_partitions=args.min_partitions)
            .rename({"Ensembl Gene ID": "gene_id", "MIM Gene Accession": "omim_accession"})
            .select("gene_id", "omim_accession")
            .key_by("gene_id")
        )
        genes = genes.annotate(**omim[genes.gene_id])

    # Add gene names from dbNSFP
    if args.dbnsfp_gene:
        dbnsfp_gene = hl.import_table(args.dbnsfp_gene, force=True, missing=".", min_partitions=args.min_partitions)
        dbnsfp_gene = dbnsfp_gene.select(
            gene_id=dbnsfp_gene["Ensembl_gene"],
            full_gene_name=dbnsfp_gene["Gene_full_name"],
            other_names=hl.or_else(dbnsfp_gene["Gene_old_names"].upper().split(";"), hl.empty_array(hl.tstr)).extend(
                hl.or_else(dbnsfp_gene["Gene_other_names"].upper().split(";"), hl.empty_array(hl.tstr))
            ),
        )
        dbnsfp_gene = dbnsfp_gene.key_by("gene_id")
        genes = genes.annotate(**dbnsfp_gene[genes.gene_id])

    genes.describe()

    genes.write(args.output)


if __name__ == "__main__":
    main()

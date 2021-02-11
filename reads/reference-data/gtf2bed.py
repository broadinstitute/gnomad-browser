import argparse
import os

import hail as hl


def gtf2bed(gtf: hl.Table) -> hl.Table:
    transcripts = gtf.filter(gtf.feature == "transcript")
    transcripts = transcripts.select(
        transcript_id=transcripts.transcript_id,
        chrom=transcripts.interval.start.seqname,
        strand=transcripts.strand,
        # Subtract one to change from GTF's 1 based indices to BED's 0 based indices
        start=transcripts.interval.start.position - 1,
        stop=transcripts.interval.end.position - 1,
    )

    exons = gtf.filter(hl.set(["exon", "CDS", "UTR"]).contains(gtf.feature))
    exons = exons.select(
        transcript_id=exons.transcript_id,
        feature_type=exons.feature,
        # Subtract one to change from GTF's 1 based indices to BED's 0 based indices
        start=exons.interval.start.position - 1,
        stop=exons.interval.end.position - 1,
    )

    transcript_exons = exons.group_by(exons.transcript_id).aggregate(exons=hl.agg.collect(exons.row_value))
    transcript_exons = transcript_exons.annotate(exons=hl.sorted(transcript_exons.exons, lambda exon: exon.start))

    transcripts = transcripts.annotate(**transcript_exons[transcripts.transcript_id])

    ds = transcripts.select(
        chrom=transcripts.chrom,
        chromStart=transcripts.start,
        # Add one because region end positions are exclusive in BED format
        chromEnd=transcripts.stop + 1,
        name=transcripts.transcript_id,
        score=0,
        strand=transcripts.strand,
        thickStart=hl.rbind(
            transcripts.exons.filter(lambda exon: exon.feature_type == "CDS"),
            lambda cds_exons: hl.if_else(hl.len(cds_exons) > 0, cds_exons.first().start, transcripts.start),
        ),
        thickEnd=hl.rbind(
            transcripts.exons.filter(lambda exon: exon.feature_type == "CDS"),
            # Add one because region end positions are exclusive in BED format
            lambda cds_exons: hl.if_else(hl.len(cds_exons) > 0, cds_exons.last().stop + 1, transcripts.start),
        ),
        itemRgb="0",
        blockCount=hl.len(transcripts.exons),
        blockSizes=hl.delimit(
            transcripts.exons.filter(lambda exon: exon.feature_type == "exon").map(
                lambda exon: exon.stop - exon.start + 1
            ),
            ",",
        ),
        blockStarts=hl.delimit(
            transcripts.exons.filter(lambda exon: exon.feature_type == "exon").map(
                lambda exon: exon.start - transcripts.start
            ),
            ",",
        ),
    )

    ds = ds.order_by(
        hl.rbind(
            ds.chrom.replace("^chr", ""),
            lambda chrom: hl.case()
            .when(chrom == "X", 23)
            .when(chrom == "Y", 24)
            .when(chrom[0] == "M", 25)
            .default(hl.int(chrom)),
        ),
        ds.chromStart,
    ).drop("interval")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("gtf", help="Path to GTF file")
    parser.add_argument("output", help="Path to output BED file")
    args = parser.parse_args()

    hl.init(log=os.devnull)

    ds = hl.experimental.import_gtf(args.gtf)
    ds = gtf2bed(ds)
    ds.export(args.output, header=False)


if __name__ == "__main__":
    main()

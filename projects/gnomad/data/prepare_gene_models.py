import argparse
import os

import hail as hl


def get_expr_for_xpos(contig, position):
    return hl.bind(
        lambda contig_number: hl.int64(contig_number) * 1_000_000_000 + position,
        hl.case()
        .when(contig == "X", 23)
        .when(contig == "Y", 24)
        .when(contig[0] == "M", 25)
        .default(hl.int(contig)),
    )


parser = argparse.ArgumentParser()
parser.add_argument("--gencode-file", required=True)
parser.add_argument("--canonical-transcript-file", required=True)
parser.add_argument("--omim-annotations-file", required=True)
parser.add_argument("--dbnsfp-file", required=True)
parser.add_argument("--output-directory", required=True)
args = parser.parse_args()

gencode = hl.experimental.import_gtf(args.gencode_file)

###############################################
# Genes                                       #
###############################################

genes = gencode.filter(gencode.feature == "gene")
genes = genes.select(
    gene_id=genes.gene_id.split("\\.")[0],
    gene_name=genes.gene_name,
    gene_name_upper=genes.gene_name.upper(),
    chrom=genes.interval.start.seqname[3:],
    strand=genes.strand,
    start=genes.interval.start.position + 1,
    stop=genes.interval.end.position + 1,
    xstart=get_expr_for_xpos(
        genes.interval.start.seqname[3:], genes.interval.start.position + 1
    ),
    xstop=get_expr_for_xpos(
        genes.interval.end.seqname[3:], genes.interval.end.position + 1
    ),
)
genes = genes.key_by("gene_id").drop("interval")

# Canonical transcripts
canonical_transcripts = hl.import_table(args.canonical_transcript_file, no_header=True)
canonical_transcripts = canonical_transcripts.select(
    gene_id=canonical_transcripts.f0, canonical_transcript=canonical_transcripts.f1
)
canonical_transcripts = canonical_transcripts.key_by("gene_id")
genes = genes.annotate(**canonical_transcripts[genes.gene_id])

# OMIM
omim = hl.import_table(args.omim_annotations_file)
omim = omim.select(
    gene_id=omim["Ensembl Gene ID"],
    omim_accession=omim["MIM Gene Accession"],
    omim_description=omim["MIM Gene Description"],
)
omim = omim.key_by("gene_id")
genes = genes.annotate(**omim[genes.gene_id])

# Full names
dbnsfp = hl.import_table(args.dbnsfp_file, missing=".")
dbnsfp = dbnsfp.select(
    gene_id=dbnsfp["Ensembl_gene"],
    full_gene_name=dbnsfp["Gene_full_name"],
    other_names=hl.or_else(
        dbnsfp["Gene_old_names"].upper().split(";"), hl.empty_array(hl.tstr)
    ).extend(
        hl.or_else(
            dbnsfp["Gene_other_names"].upper().split(";"), hl.empty_array(hl.tstr)
        )
    ),
)
dbnsfp = dbnsfp.key_by("gene_id")
genes = genes.annotate(**dbnsfp[genes.gene_id])

genes.key_by().write(os.path.join(args.output_directory, "genes.ht"))

###############################################
# Transcripts                                 #
###############################################

transcripts = gencode.filter(gencode.feature == "transcript")
transcripts = transcripts.select(
    transcript_id=transcripts.transcript_id.split("\\.")[0],
    gene_id=transcripts.gene_id.split("\\.")[0],
    chrom=transcripts.interval.start.seqname[3:],
    strand=transcripts.strand,
    start=transcripts.interval.start.position + 1,
    stop=transcripts.interval.end.position + 1,
    xstart=get_expr_for_xpos(
        transcripts.interval.start.seqname[3:], transcripts.interval.start.position + 1
    ),
    xstop=get_expr_for_xpos(
        transcripts.interval.end.seqname[3:], transcripts.interval.end.position + 1
    ),
)
transcripts = transcripts.key_by().drop("interval")

transcripts.write(os.path.join(args.output_directory, "transcripts.ht"))

###############################################
# Exons                                       #
###############################################

exons = gencode.filter(hl.set(["exon", "CDS", "UTR"]).contains(gencode.feature))
exons = exons.select(
    feature_type=exons.feature,
    transcript_id=exons.transcript_id.split("\\.")[0],
    gene_id=exons.gene_id.split("\\.")[0],
    chrom=exons.interval.start.seqname[3:],
    strand=exons.strand,
    start=exons.interval.start.position + 1,
    stop=exons.interval.end.position + 1,
    xstart=get_expr_for_xpos(
        exons.interval.start.seqname[3:], exons.interval.start.position + 1
    ),
    xstop=get_expr_for_xpos(
        exons.interval.end.seqname[3:], exons.interval.end.position + 1
    ),
)
exons = exons.key_by().drop("interval")

exons.write(os.path.join(args.output_directory, "exons.ht"))

import hail as hl


def x_position(chrom, position):
    contig_number = (
        hl.case().when(chrom == "X", 23).when(chrom == "Y", 24).when(chrom[0] == "M", 25).default(hl.int(chrom))
    )
    return hl.int64(contig_number) * 1_000_000_000 + position

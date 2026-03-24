import hail as hl


def filter_phase1_predicate(GT):
    return hl.any([hl.all([GT[0] == 1, GT[1] == 0]), GT.is_hom_var()])


def filter_phase2_predicate(GT):
    return hl.any([hl.all([GT[0] == 0, GT[1] == 1]), GT.is_hom_var()])


def prepare_long_read_haplotypes(mt_path: str):
    mt = hl.read_matrix_table(mt_path)
    ht = mt.entries()

    # Process Strand 1
    ht1 = ht.filter(filter_phase1_predicate(ht.GT))
    ht1 = ht1.annotate(strand=1)

    # Process Strand 2
    ht2 = ht.filter(filter_phase2_predicate(ht.GT))
    ht2 = ht2.annotate(strand=2)

    # Union strands
    flat_ht = ht1.union(ht2)

    # Select and flatten fields for Elasticsearch
    flat_ht = flat_ht.select(
        sample_id=flat_ht.s,
        strand=flat_ht.strand,
        chrom=flat_ht.locus.contig,
        position=flat_ht.locus.position,
        alleles=flat_ht.alleles,
        rsid=flat_ht.rsid,
        qual=flat_ht.qual,
        filters=hl.array(flat_ht.filters),
        info_AF=flat_ht.info.AF,
        info_AC=flat_ht.info.AC,
        info_CM=flat_ht.info.CM,
        info_AN=flat_ht.info.AN,
        info_SVTYPE=flat_ht.info.SVTYPE,
        info_SVLEN=flat_ht.info.SVLEN,
        gt_alleles=flat_ht.GT.alleles,
        gt_phased=flat_ht.GT.phased,
    )

    flat_ht = flat_ht.annotate(
        document_id=flat_ht.sample_id
        + "_"
        + hl.str(flat_ht.strand)
        + "_"
        + flat_ht.chrom
        + "_"
        + hl.str(flat_ht.position)
        + "_"
        + flat_ht.alleles[0]
        + "_"
        + flat_ht.alleles[1]
    )

    return flat_ht.key_by("document_id")

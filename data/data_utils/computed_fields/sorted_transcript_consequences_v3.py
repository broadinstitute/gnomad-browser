import hail as hl

from .hgvs import hgvsp_from_consequence_amino_acids
from .vep import consequence_term_rank

OMIT_CONSEQUENCE_TERMS = hl.set(["upstream_gene_variant", "downstream_gene_variant"])


def sorted_transcript_consequences_v3(vep_root):
    """
    Sort transcripts by 3 properties:

        1. coding > non-coding
        2. transcript consequence severity
        3. canonical > non-canonical

    For each transcript consequence in the array, adds these fields:
        * major_consequence: set to most severe consequence for that transcript
            (VEP sometimes provides multiple consequences for a single transcript)

    and modifies these:
        * canonical: converts integer field to boolean
        * domains: converts structs with db/name fields to string db:name
        * gene_id: converts ENSG string to integer
        * hgvsc: removes transcript ID
        * hgvsp: removes transcript ID, formats for synonymous variants
        * transcript_id: converts ENST string to integer

    Args:
        vep_root (StructExpression): root path of the VEP struct in the MT
    """

    consequences = vep_root.transcript_consequences

    # Drop irrelevant consequences
    consequences = consequences.map(
        lambda c: c.annotate(
            consequence_terms=c.consequence_terms.filter(lambda t: ~OMIT_CONSEQUENCE_TERMS.contains(t))
        )
    ).filter(lambda c: c.consequence_terms.size() > 0)

    # Add derived fields
    consequences = consequences.map(
        lambda c: c.annotate(major_consequence=hl.sorted(c.consequence_terms, key=consequence_term_rank)[0])
    ).map(
        lambda c: c.annotate(
            canonical=hl.bool(c.canonical),
            domains=c.domains.map(lambda domain: domain.db + ":" + domain.name),
            gene_id=hl.int(c.gene_id[4:]),
            hgvsc=c.hgvsc.split(":")[-1],
            hgvsp=hgvsp_from_consequence_amino_acids(c),
            transcript_id=hl.int(c.transcript_id[4:]),
        )
    )

    # Sort
    consequences = hl.sorted(
        consequences,
        lambda c: (
            hl.bind(
                lambda is_coding, is_most_severe, is_canonical: (
                    hl.cond(
                        is_coding,
                        hl.cond(is_most_severe, hl.cond(is_canonical, 1, 2), hl.cond(is_canonical, 3, 4)),
                        hl.cond(is_most_severe, hl.cond(is_canonical, 5, 6), hl.cond(is_canonical, 7, 8)),
                    )
                ),
                hl.or_else(c.biotype, "") == "protein_coding",
                c.major_consequence == vep_root.most_severe_consequence,
                hl.or_else(c.canonical, False),
            )
        ),
    )

    # Select fields
    consequences = consequences.map(
        lambda c: c.select(
            "canonical",
            "consequence_terms",
            "domains",
            "gene_id",
            "gene_symbol",
            "hgvsc",
            "hgvsp",
            "lof_filter",
            "lof_flags",
            "lof",
            "major_consequence",
            "polyphen_prediction",
            "sift_prediction",
            "transcript_id",
        )
    )

    return consequences

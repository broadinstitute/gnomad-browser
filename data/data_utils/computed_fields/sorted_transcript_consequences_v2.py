import hail as hl

from .hgvs import hgvsp_from_consequence_amino_acids
from .vep import consequence_term_rank

OMIT_CONSEQUENCE_TERMS = hl.set(["upstream_gene_variant", "downstream_gene_variant"])
SPLICE_CONSEQUENCES = hl.set(["splice_donor_variant", "splice_acceptor_variant", "splice_region_variant"])


def sorted_transcript_consequences_v2(vep_root):
    """Sort transcripts by 3 properties:

        1. coding > non-coding
        2. transcript consequence severity
        3. canonical > non-canonical

    so that the 1st array entry will be for the coding, most-severe, canonical transcript (assuming
    one exists).

    Also, for each transcript in the array, computes these additional fields:
        domains: converts structs with db/name fields to string db:name
        hgvs: hgvsp (formatted for synonymous variants) if it exists, otherwise hgvsc
        major_consequence: set to most severe consequence for that transcript (
            VEP sometimes provides multiple consequences for a single transcript)
        major_consequence_rank: major_consequence rank based on VEP SO ontology (most severe = 1)
            (see http://www.ensembl.org/info/genome/variation/predicted_data.html)
        category: set to one of: "lof", "missense", "synonymous", "other" based on the value of major_consequence.

    Args:
        vep_root (StructExpression): root path of the VEP struct in the MT
    """

    consequences = (
        vep_root.transcript_consequences.map(
            lambda c: c.annotate(
                consequence_terms=c.consequence_terms.filter(lambda t: ~OMIT_CONSEQUENCE_TERMS.contains(t))
            )
        )
        .filter(lambda c: c.consequence_terms.size() > 0)
        .map(lambda c: c.annotate(major_consequence=hl.sorted(c.consequence_terms, key=consequence_term_rank)[0]))
        .map(
            lambda c: c.annotate(
                category=(
                    hl.case()
                    .when(
                        consequence_term_rank(c.major_consequence) <= consequence_term_rank("frameshift_variant"), "lof"
                    )
                    .when(
                        consequence_term_rank(c.major_consequence) <= consequence_term_rank("missense_variant"),
                        "missense",
                    )
                    .when(
                        consequence_term_rank(c.major_consequence) <= consequence_term_rank("synonymous_variant"),
                        "synonymous",
                    )
                    .default("other")
                ),
                domains=c.domains.map(lambda domain: domain.db + ":" + domain.name),
                hgvs=hl.cond(
                    hl.is_missing(c.hgvsp) | SPLICE_CONSEQUENCES.contains(c.major_consequence),
                    c.hgvsc.split(":")[-1],
                    hgvsp_from_consequence_amino_acids(c),
                ),
                major_consequence_rank=consequence_term_rank(c.major_consequence),
            )
        )
    )

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
                hl.set(c.consequence_terms).contains(vep_root.most_severe_consequence),
                hl.or_else(c.canonical, 0) == 1,
            )
        ),
    )

    consequences = hl.zip_with_index(consequences).map(
        lambda csq_with_index: csq_with_index[1].annotate(transcript_rank=csq_with_index[0])
    )

    # TODO: Discard most of lof_info field
    # Keep whether lof_info contains DONOR_DISRUPTION, ACCEPTOR_DISRUPTION, or DE_NOVO_DONOR
    consequences = consequences.map(
        lambda c: c.select(
            "amino_acids",
            "biotype",
            "canonical",
            "category",
            "cdna_end",
            "cdna_start",
            "codons",
            "consequence_terms",
            "domains",
            "gene_id",
            "gene_symbol",
            "hgvs",
            "hgvsc",
            "hgvsp",
            "lof_filter",
            "lof_flags",
            "lof_info",
            "lof",
            "major_consequence",
            "major_consequence_rank",
            "polyphen_prediction",
            "protein_id",
            "protein_start",
            "sift_prediction",
            "transcript_id",
            "transcript_rank",
        )
    )

    return consequences

import hail as hl

PROTEIN_LETTERS_1TO3 = hl.dict(
    {
        "A": "Ala",
        "C": "Cys",
        "D": "Asp",
        "E": "Glu",
        "F": "Phe",
        "G": "Gly",
        "H": "His",
        "I": "Ile",
        "K": "Lys",
        "L": "Leu",
        "M": "Met",
        "N": "Asn",
        "P": "Pro",
        "Q": "Gln",
        "R": "Arg",
        "S": "Ser",
        "T": "Thr",
        "V": "Val",
        "W": "Trp",
        "Y": "Tyr",
        "X": "Ter",
        "*": "Ter",
        "U": "Sec",
    }
)


SPLICE_CONSEQUENCES = hl.set(["splice_donor_variant", "splice_acceptor_variant", "splice_region_variant"])


def hgvsp_from_consequence_amino_acids(csq):
    return hl.cond(
        hl.is_missing(csq.hgvsp) | SPLICE_CONSEQUENCES.contains(csq.major_consequence),
        hl.null(hl.tstr),
        hl.cond(
            csq.hgvsp.contains("=") | csq.hgvsp.contains("%3D"),
            hl.bind(
                lambda protein_letters: "p." + protein_letters + hl.str(csq.protein_start) + protein_letters,
                hl.delimit(
                    csq.amino_acids.split("").filter(lambda l: l != "").map(lambda l: PROTEIN_LETTERS_1TO3.get(l)), ""
                ),
            ),
            csq.hgvsp.split(":")[-1],
        ),
    )

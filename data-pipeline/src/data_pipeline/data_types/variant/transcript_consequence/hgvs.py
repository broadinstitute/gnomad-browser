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


def hgvsp_from_consequence_amino_acids(csq):
    return hl.if_else(
        csq.hgvsp.contains("=") | csq.hgvsp.contains("%3D"),
        hl.bind(
            lambda protein_letters: "p." + protein_letters + hl.str(csq.protein_start) + protein_letters,
            hl.delimit(
                csq.amino_acids.split("").filter(lambda letter: letter != "").map(PROTEIN_LETTERS_1TO3.get),
                "",
            ),
        ),
        csq.hgvsp.split(":")[-1],
    )

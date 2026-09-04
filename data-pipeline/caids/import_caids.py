"""Import CAIDs created by `get_caids.py` into a Hail Table."""

import argparse

import hail as hl

from core.enums import ReferenceGenome


def import_caids(caids_url: str, output_url: str, reference_genome: ReferenceGenome = ReferenceGenome.GRCh38) -> None:
    """
    Import CAIDs created by `get_caids.py` into a Hail Table.

    :param caids_url: URL of directory/prefix where CAID files are located.
    :param output_url: URL for output Hail Table.
    """
    caids_url = caids_url.rstrip("/")
    ds = hl.import_table(
        f"{caids_url}/part-*.tsv",
        types={
            "locus": hl.tlocus(reference_genome.value),
            "alleles": hl.tarray(hl.tstr),
            "CAID": hl.tstr,
        },
        key=("locus", "alleles"),
        missing=".",
    )
    ds = ds.rename({"CAID": "caid"})

    ds.write(output_url, overwrite=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("caids_url")
    parser.add_argument("output_url")
    parser.add_argument(
        "--reference-genome",
        type=ReferenceGenome,
        choices=[g.value for g in ReferenceGenome],
        default=ReferenceGenome.GRCh38,
    )
    args = parser.parse_args()
    import_caids(args.caids_url, args.output_url, args.reference_genome)


if __name__ == "__main__":
    main()

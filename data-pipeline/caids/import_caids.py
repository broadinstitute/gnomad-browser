"""Import CAIDs created by `get_caids.py` into a Hail Table."""

import argparse

import hail as hl


def import_caids(caids_url: str, output_url: str, reference_genome: str = "GRCh38") -> None:
    """
    Import CAIDs created by `get_caids.py` into a Hail Table.

    :param caids_url: URL of directory/prefix where CAID files are located.
    :param output_url: URL for output Hail Table.
    """
    caids_url = caids_url.rstrip("/")
    ds = hl.import_table(
        f"{caids_url}/part-*.tsv",
        types={"locus": hl.tlocus(reference_genome), "alleles": hl.tarray(hl.tstr), "CAID": hl.tstr,},
        key=("locus", "alleles"),
        missing=".",
    )
    ds = ds.rename({"CAID": "caid"})

    ds.write(output_url, overwrite=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("caids_url")
    parser.add_argument("output_url")
    parser.add_argument("--reference-genome", choices=("GRCh37", "GRCh38"), default="GRCh38")
    args = parser.parse_args()

    hl.init()

    import_caids(args.caids_url, args.output_url, args.reference_genome)


if __name__ == "__main__":
    main()

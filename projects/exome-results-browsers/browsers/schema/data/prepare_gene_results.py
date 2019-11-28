import argparse

import hail as hl


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_url")
    parser.add_argument("output_url")
    parser.add_argument("--genes", required=True)
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = hl.read_table(args.input_url)

    ds = ds.annotate(analysis_group="meta")

    genes = hl.read_table(args.genes)
    genes = genes.key_by("gene_id")
    ds = ds.annotate(chrom=genes[ds.gene_id].chrom, pos=genes[ds.gene_id].start)

    ds.write(args.output_url)


if __name__ == "__main__":
    main()

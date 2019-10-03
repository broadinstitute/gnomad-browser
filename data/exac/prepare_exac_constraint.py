import argparse

import hail as hl


def format_exac_constraint(ds):
    # Select relevant fields
    ds = ds.select(
        transcript_id=ds.transcript.split("\\.")[0],
        # Expected
        exp_syn=hl.float(ds.exp_syn),
        exp_mis=hl.float(ds.exp_mis),
        exp_lof=hl.float(ds.exp_lof),
        # Actual
        obs_syn=hl.int(ds.n_syn),
        obs_mis=hl.int(ds.n_mis),
        obs_lof=hl.int(ds.n_lof),
        # mu
        mu_syn=hl.float(ds.mu_syn),
        mu_mis=hl.float(ds.mu_mis),
        mu_lof=hl.float(ds.mu_lof),
        # Z
        syn_z=hl.float(ds.syn_z),
        mis_z=hl.float(ds.mis_z),
        lof_z=hl.float(ds.lof_z),
        # Other
        pLI=hl.float(ds.pLI),
    )

    ds = ds.key_by("transcript_id")

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--exac-constraint",
        default="gs://gnomad-public/legacy/exac_browser/forweb_cleaned_exac_r03_march16_z_data_pLI_CNV-final.txt.gz",
    )
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    ds = hl.import_table(args.exac_constraint, force=True)
    ds = ds.repartition(8, shuffle=True)

    ds = format_exac_constraint(ds)

    ds.write(args.output)


if __name__ == "__main__":
    main()

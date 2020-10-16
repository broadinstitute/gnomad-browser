import hail as hl


def prepare_exac_constraint(path):
    ds = hl.import_table(path, force=True)
    ds = ds.repartition(32, shuffle=True)

    # Select relevant fields
    ds = ds.select(
        # Remove version number from transcript ID
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
        pli=hl.float(ds.pLI),
    )

    ds = ds.key_by("transcript_id")

    return ds

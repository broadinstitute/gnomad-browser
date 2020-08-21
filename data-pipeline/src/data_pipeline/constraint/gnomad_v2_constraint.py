import hail as hl


def prepare_gnomad_v2_constraint(path):
    ds = hl.read_table(path)

    # Don't need the information in globals for the browser
    ds = ds.select_globals()

    # Select relevant fields
    ds = ds.select(
        # ID
        transcript_id=ds.transcript,
        gene_id=ds.gene_id,
        # Expected
        exp_lof=ds.exp_lof,
        exp_mis=ds.exp_mis,
        exp_syn=ds.exp_syn,
        # Observed
        obs_lof=ds.obs_lof,
        obs_mis=ds.obs_mis,
        obs_syn=ds.obs_syn,
        # Observed/Expected
        oe_lof=ds.oe_lof,
        oe_lof_lower=ds.oe_lof_lower,
        oe_lof_upper=ds.oe_lof_upper,
        oe_mis=ds.oe_mis,
        oe_mis_lower=ds.oe_mis_lower,
        oe_mis_upper=ds.oe_mis_upper,
        oe_syn=ds.oe_syn,
        oe_syn_lower=ds.oe_syn_lower,
        oe_syn_upper=ds.oe_syn_upper,
        # Z
        lof_z=ds.lof_z,
        mis_z=ds.mis_z,
        syn_z=ds.syn_z,
        # Other
        pli=ds.pLI,
        flags=ds.constraint_flag,
    )

    ds = ds.key_by("transcript_id")

    return ds

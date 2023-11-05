import hail as hl


def prepare_gnomad_v4_constraint(path):
    ds = hl.read_table(path)

    # Don't need the information in globals for the browser
    ds = ds.select_globals()

    # Select relevant fields
    ds = ds.select(
        # ID
        transcript_id=ds.transcript,
        gene_id=ds.gene,
        # Expected
        exp_lof=ds.lof.exp,
        exp_mis=ds.mis.exp,
        exp_syn=ds.syn.exp,
        # Observed
        obs_lof=ds.lof.obs,
        obs_mis=ds.mis.obs,
        obs_syn=ds.syn.obs,
        # Observed/Expected
        oe_lof=ds.lof.oe,
        oe_lof_lower=ds.lof.oe_ci.lower,
        oe_lof_upper=ds.lof.oe_ci.upper,
        oe_mis=ds.mis.oe,
        oe_mis_lower=ds.mis.oe_ci.lower,
        oe_mis_upper=ds.mis.oe_ci.upper,
        oe_syn=ds.syn.oe,
        oe_syn_lower=ds.syn.oe_ci.lower,
        oe_syn_upper=ds.syn.oe_ci.upper,
        # Z
        lof_z=ds.lof.z_score,
        mis_z=ds.mis.z_score,
        syn_z=ds.syn.z_score,
        # Other
        pli=ds.lof.pLI,
        flags=ds.constraint_flags,
    )

    ds = ds.filter(ds.transcript.contains("ENST"))

    ds = ds.key_by("transcript_id")

    return ds

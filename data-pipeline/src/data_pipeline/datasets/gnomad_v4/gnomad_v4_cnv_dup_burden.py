import hail as hl


def prepare_cnv_dup_burden(burden_path):
    dup_burden = hl.import_table(burden_path, force_bgz=True, types={"xpos": hl.tfloat64, "burden_dup": hl.tfloat64})

    dup_burden = dup_burden.select("xpos", "burden_dup")

    return dup_burden

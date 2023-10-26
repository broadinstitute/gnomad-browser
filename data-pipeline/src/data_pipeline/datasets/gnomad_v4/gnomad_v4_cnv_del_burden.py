import hail as hl


def prepare_cnv_del_burden(burden_path):
    del_burden = hl.import_table(burden_path, force_bgz=True, types={"xpos": hl.tfloat64, "burden_del": hl.tfloat64})

    del_burden = del_burden.select("xpos", "burden_del")

    return del_burden

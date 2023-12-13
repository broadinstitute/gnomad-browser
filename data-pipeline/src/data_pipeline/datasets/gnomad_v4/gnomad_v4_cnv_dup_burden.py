import hail as hl


def extract_contig_and_position(xpos: hl.expr.Int64Expression) -> (hl.expr.StringExpression, hl.expr.Float64Expression):
    value_str = hl.str(xpos)
    contig_number_length = 1

    is_double_digit = (hl.len(value_str) == 11) & (value_str[:2] != "00")
    contig_number_length = hl.if_else(is_double_digit, 2, contig_number_length)

    contig_number = value_str[:contig_number_length]
    position = hl.float64(value_str[contig_number_length:])

    return contig_number, position


def get_contig(xpos: hl.expr.StringExpression) -> hl.expr.StringExpression:
    contig_number, _ = extract_contig_and_position(xpos)
    return hl.str(contig_number)


def get_position(xpos: hl.expr.Int64Expression) -> hl.expr.Float64Expression:
    _, position = extract_contig_and_position(xpos)
    return position


def prepare_cnv_dup_burden(dup_burden_path):
    dup_burden = hl.import_table(dup_burden_path, force_bgz=True, types={"xpos": hl.tint64, "burden_dup": hl.tfloat64})

    dup_burden = dup_burden.annotate(contig=get_contig(dup_burden.xpos), position=get_position(dup_burden.xpos))

    dup_burden = dup_burden.select("xpos", "burden_dup", "contig", "position")

    return dup_burden

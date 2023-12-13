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


def prepare_cnv_track_callable(coverage_path):
    coverage = hl.import_table(
        coverage_path, force_bgz=True, types={"xpos": hl.tint64, "percent_callable": hl.tfloat64}
    )

    coverage = coverage.annotate(contig=get_contig(coverage.xpos), position=get_position(coverage.xpos))

    coverage = coverage.select("xpos", "percent_callable", "contig", "position")

    return coverage

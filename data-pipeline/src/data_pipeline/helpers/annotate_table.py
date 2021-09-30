import hail as hl


def annotate_table(table_path, join_on=None, **annotation_table_paths):
    ds = hl.read_table(table_path)

    for annotation_key, annotation_table_path in annotation_table_paths.items():
        annotation_table = hl.read_table(annotation_table_path)

        ds = ds.annotate_globals(
            annotations=getattr(ds.globals, "annotations", hl.struct()).annotate(
                **{annotation_key: hl.eval(annotation_table.globals)}
            )
        )

        # If the table has only one non-key field, add that field's value directly to the table.
        # Otherwise, add a struct field containing the annotation table's value.
        if len(annotation_table.row_value) == 1:
            ds = ds.annotate(**annotation_table[ds[join_on] if join_on else ds.key])
        else:
            ds = ds.annotate(**{annotation_key: annotation_table[ds[join_on] if join_on else ds.key]})

    return ds

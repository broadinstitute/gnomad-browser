import hail as hl
import itertools


def group_frequencies_by_population(ds, freq_fields, populations):
    # TK: to get around the sex/pop/field ordering issue, pass in as a list of lists in order
    divisions = list(itertools.chain.from_iterable([pop, f"{pop}_XX", f"{pop}_XY"] for pop in populations)) + [
        "XX",
        "XY",
    ]

    ds = ds.annotate(
        freq=hl.struct(
            **{field.lower(): ds.info[field] for field in freq_fields},
            populations=[
                hl.struct(id=pop_id, **{field.lower(): ds.info[f"{field}_{pop_id}"] for field in freq_fields})
                for pop_id in divisions
            ],
        )
    )
    return ds

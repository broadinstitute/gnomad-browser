import hail as hl


def group_consequence_genes(ds, ranked_consequences, ignored_consequences=["INTERGENIC", "NEAREST_TSS"]):
    ds = ds.annotate(
        consequences=hl.array(
            [
                hl.struct(
                    consequence=csq.lower(),
                    genes=hl.or_else(ds.info[f"PREDICTED_{csq}"], hl.empty_array(hl.tstr)),
                )
                for csq in ranked_consequences
                if csq not in ignored_consequences
            ]
        ).filter(lambda csq: hl.len(csq.genes) > 0)
    )

    ds = ds.annotate(intergenic=ds.info.PREDICTED_INTERGENIC)

    ds = ds.annotate(
        major_consequence=hl.rbind(
            ds.consequences.find(lambda csq: hl.len(csq.genes) > 0),
            lambda csq: hl.or_else(csq.consequence, hl.or_missing(ds.intergenic, "intergenic")),
        )
    )

    # Collect set of all genes for which a variant has a consequence
    ds = ds.annotate(genes=hl.set(ds.consequences.flatmap(lambda c: c.genes)))
    return ds

import argparse
import csv
import itertools
import tempfile

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    CONSEQUENCE_TERM_RANK_LOOKUP,
    get_expr_for_contig,
    get_expr_for_xpos,
)

p = argparse.ArgumentParser()
p.add_argument("--mnv-url", help="URL of MNV TSV file", required=True)
p.add_argument("--three-bp-mnv-url", help="URL of 3bp MNV TSV file", required=True)
p.add_argument("--output-url", help="URL to write output Hail table to", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")


def import_mnv_file(path, **kwargs):
    column_types = {
        "AC_mnv_ex": hl.tint,
        "AC_mnv_gen": hl.tint,
        "AC_mnv": hl.tint,
        "AC_snp1_ex": hl.tint,
        "AC_snp1_gen": hl.tint,
        "AC_snp1": hl.tint,
        "AC_snp2_ex": hl.tint,
        "AC_snp2_gen": hl.tint,
        "AC_snp2": hl.tint,
        "AN_snp1_ex": hl.tfloat,
        "AN_snp1_gen": hl.tfloat,
        "AN_snp2_ex": hl.tfloat,
        "AN_snp2_gen": hl.tfloat,
        "categ": hl.tstr,
        "filter_snp1_ex": hl.tarray(hl.tstr),
        "filter_snp1_gen": hl.tarray(hl.tstr),
        "filter_snp2_ex": hl.tarray(hl.tstr),
        "filter_snp2_gen": hl.tarray(hl.tstr),
        "gene_id": hl.tstr,
        "gene_name": hl.tstr,
        "locus.contig": hl.tstr,
        "locus.position": hl.tint,
        "mnv_amino_acids": hl.tstr,
        "mnv_codons": hl.tstr,
        "mnv_consequence": hl.tstr,
        "mnv_lof": hl.tstr,
        "mnv": hl.tstr,
        "n_homhom_ex": hl.tint,
        "n_homhom_gen": hl.tint,
        "n_homhom": hl.tint,
        "n_indv_ex": hl.tint,
        "n_indv_gen": hl.tint,
        "n_indv": hl.tint,
        "snp1_amino_acids": hl.tstr,
        "snp1_codons": hl.tstr,
        "snp1_consequence": hl.tstr,
        "snp1_lof": hl.tstr,
        "snp1": hl.tstr,
        "snp2_amino_acids": hl.tstr,
        "snp2_codons": hl.tstr,
        "snp2_consequence": hl.tstr,
        "snp2_lof": hl.tstr,
        "snp2": hl.tstr,
        "transcript_id": hl.tstr,
    }

    ds = hl.import_table(path, key="mnv", missing="", types=column_types, **kwargs)

    ds = ds.transmute(locus=hl.locus(ds["locus.contig"], ds["locus.position"]))

    ds = ds.transmute(
        contig=get_expr_for_contig(ds.locus),
        pos=ds.locus.position,
        xpos=get_expr_for_xpos(ds.locus),
    )

    ds = ds.annotate(
        ref=ds.mnv.split("-")[2], alt=ds.mnv.split("-")[3], variant_id=ds.mnv
    )

    ds = ds.annotate(snp1_copy=ds.snp1, snp2_copy=ds.snp2)
    ds = ds.transmute(
        constituent_snvs=[
            hl.bind(
                lambda variant_id_parts: hl.struct(
                    variant_id=ds[f"{snp}_copy"],
                    chrom=variant_id_parts[0],
                    pos=hl.int(variant_id_parts[1]),
                    ref=variant_id_parts[2],
                    alt=variant_id_parts[3],
                    exome=hl.or_missing(
                        hl.is_defined(ds[f"AN_{snp}_ex"]),
                        hl.struct(
                            filters=ds[f"filter_{snp}_ex"],
                            ac=ds[f"AC_{snp}_ex"],
                            an=hl.int(ds[f"AN_{snp}_ex"]),
                        ),
                    ),
                    genome=hl.or_missing(
                        hl.is_defined(ds[f"AN_{snp}_gen"]),
                        hl.struct(
                            filters=ds[f"filter_{snp}_gen"],
                            ac=ds[f"AC_{snp}_gen"],
                            an=hl.int(ds[f"AN_{snp}_gen"]),
                        ),
                    ),
                ),
                ds[f"{snp}_copy"].split("-"),
            )
            for snp in ["snp1", "snp2"]
        ]
    )

    ds = ds.annotate(constituent_snv_ids=[ds.snp1, ds.snp2])

    ds = ds.annotate(
        mnv_in_exome=ds.constituent_snvs.all(lambda s: hl.is_defined(s.exome)),
        mnv_in_genome=ds.constituent_snvs.all(lambda s: hl.is_defined(s.genome)),
    )

    ds = ds.transmute(
        n_individuals=ds.n_indv,
        ac=ds.AC_mnv,
        ac_hom=ds.n_homhom,
        exome=hl.or_missing(
            ds.mnv_in_exome,
            hl.struct(
                n_individuals=ds.n_indv_ex, ac=ds.AC_mnv_ex, ac_hom=ds.n_homhom_ex
            ),
        ),
        genome=hl.or_missing(
            ds.mnv_in_genome,
            hl.struct(
                n_individuals=ds.n_indv_gen, ac=ds.AC_mnv_gen, ac_hom=ds.n_homhom_gen
            ),
        ),
    )

    ds = ds.drop("AC_snp1", "AC_snp2")

    ds = ds.transmute(
        consequence=hl.struct(
            category=ds.categ,
            gene_id=ds.gene_id,
            gene_name=ds.gene_name,
            transcript_id=ds.transcript_id,
            consequence=ds.mnv_consequence,
            codons=ds.mnv_codons,
            amino_acids=ds.mnv_amino_acids,
            lof=ds.mnv_lof,
            snv_consequences=[
                hl.struct(
                    variant_id=ds[f"{snp}"],
                    amino_acids=ds[f"{snp}_amino_acids"],
                    codons=ds[f"{snp}_codons"],
                    consequence=ds[f"{snp}_consequence"],
                    lof=ds[f"{snp}_lof"],
                )
                for snp in ["snp1", "snp2"]
            ],
        )
    )

    # Collapse table to one row per MNV, with all consequences for the MNV collected into an array
    consequences = ds.group_by(ds.mnv).aggregate(
        consequences=hl.agg.collect(ds.consequence)
    )
    ds = ds.drop("consequence")
    ds = ds.distinct()
    ds = ds.join(consequences)

    # Sort consequences by severity
    ds = ds.annotate(
        consequences=hl.sorted(
            ds.consequences,
            key=lambda c: CONSEQUENCE_TERM_RANK_LOOKUP.get(c.consequence),
        )
    )

    ds = ds.annotate(
        changes_amino_acids_for_snvs=hl.literal([0, 1])
        .filter(
            lambda idx: ds.consequences.any(
                lambda csq: csq.snv_consequences[idx].amino_acids.lower()
                != csq.amino_acids.lower()
            )
        )
        .map(lambda idx: ds.constituent_snv_ids[idx])
    )

    return ds


def import_three_bp_mnv_file(path, **kwargs):
    column_types = {
        "AC_snp1_ex": hl.tfloat,
        "AC_snp1_gen": hl.tfloat,
        "AC_snp1": hl.tfloat,
        "AC_snp2_ex": hl.tfloat,
        "AC_snp2_gen": hl.tfloat,
        "AC_snp2": hl.tfloat,
        "AC_snp3_ex": hl.tfloat,
        "AC_snp3_gen": hl.tfloat,
        "AC_snp3": hl.tfloat,
        "AC_tnv_ex": hl.tint,
        "AC_tnv_gen": hl.tint,
        "AC_tnv": hl.tint,
        "alleles": hl.tarray(hl.tstr),
        "AN_snp1_ex": hl.tfloat,
        "AN_snp1_gen": hl.tfloat,
        "AN_snp2_ex": hl.tfloat,
        "AN_snp2_gen": hl.tfloat,
        "AN_snp3_ex": hl.tfloat,
        "AN_snp3_gen": hl.tfloat,
        "filter_snp1_ex": hl.tarray(hl.tstr),
        "filter_snp1_gen": hl.tarray(hl.tstr),
        "filter_snp2_ex": hl.tarray(hl.tstr),
        "filter_snp2_gen": hl.tarray(hl.tstr),
        "filter_snp3_ex": hl.tarray(hl.tstr),
        "filter_snp3_gen": hl.tarray(hl.tstr),
        "gene_id": hl.tstr,
        "gene_name": hl.tstr,
        "locus": hl.tlocus(),
        "n_indv_tnv_ex": hl.tint,
        "n_indv_tnv_gen": hl.tint,
        "n_indv_tnv": hl.tint,
        "n_tnv_hom_ex": hl.tint,
        "n_tnv_hom_gen": hl.tint,
        "n_tnv_hom": hl.tint,
        "snp1_amino_acids": hl.tstr,
        "snp1_codons": hl.tstr,
        "snp1_cons": hl.tstr,
        "snp1_lof": hl.tstr,
        "snp1": hl.tstr,
        "snp12_mnv_amino_acids": hl.tstr,
        "snp12_mnv_categ": hl.tstr,
        "snp12_mnv_codons": hl.tstr,
        "snp12_mnv_cons": hl.tstr,
        "snp12_mnv_lof": hl.tstr,
        "snp12_mnv_n_indv_ex": hl.tstr,
        "snp12_mnv_n_indv_gen": hl.tstr,
        "snp13_mnv_amino_acids": hl.tstr,
        "snp13_mnv_categ": hl.tstr,
        "snp13_mnv_codons": hl.tstr,
        "snp13_mnv_cons": hl.tstr,
        "snp13_mnv_lof": hl.tstr,
        "snp13_mnv_n_indv_ex": hl.tstr,
        "snp13_mnv_n_indv_gen": hl.tstr,
        "snp2_amino_acids": hl.tstr,
        "snp2_codons": hl.tstr,
        "snp2_cons": hl.tstr,
        "snp2_lof": hl.tstr,
        "snp2": hl.tstr,
        "snp23_mnv_amino_acids": hl.tstr,
        "snp23_mnv_categ": hl.tstr,
        "snp23_mnv_codons": hl.tstr,
        "snp23_mnv_cons": hl.tstr,
        "snp23_mnv_lof": hl.tstr,
        "snp23_mnv_n_indv_ex": hl.tstr,
        "snp23_mnv_n_indv_gen": hl.tstr,
        "snp3_amino_acids": hl.tstr,
        "snp3_codons": hl.tstr,
        "snp3_cons": hl.tstr,
        "snp3_lof": hl.tstr,
        "snp3": hl.tstr,
        "tnv_amino_acids": hl.tstr,
        "tnv_codons": hl.tstr,
        "tnv_cons": hl.tstr,
        "tnv_lof": hl.tstr,
        "tnv": hl.tstr,
        "transcript_id": hl.tstr,
    }

    ds = hl.import_table(path, missing="", types=column_types, **kwargs)
    ds = ds.key_by(mnv=ds.tnv)

    ds = ds.transmute(
        contig=get_expr_for_contig(ds.locus),
        pos=ds.locus.position,
        xpos=get_expr_for_xpos(ds.locus),
    )

    ds = ds.transmute(ref=ds.alleles[0], alt=ds.alleles[1], variant_id=ds.tnv)

    ds = ds.annotate(snp1_copy=ds.snp1, snp2_copy=ds.snp2, snp3_copy=ds.snp3)
    ds = ds.transmute(
        constituent_snvs=[
            hl.bind(
                lambda variant_id_parts: hl.struct(
                    variant_id=ds[f"{snp}_copy"],
                    chrom=variant_id_parts[0],
                    pos=hl.int(variant_id_parts[1]),
                    ref=variant_id_parts[2],
                    alt=variant_id_parts[3],
                    exome=hl.or_missing(
                        hl.is_defined(ds[f"AN_{snp}_ex"]),
                        hl.struct(
                            filters=ds[f"filter_{snp}_ex"],
                            ac=hl.int(ds[f"AC_{snp}_ex"]),
                            an=hl.int(ds[f"AN_{snp}_ex"]),
                        ),
                    ),
                    genome=hl.or_missing(
                        hl.is_defined(ds[f"AN_{snp}_gen"]),
                        hl.struct(
                            filters=ds[f"filter_{snp}_gen"],
                            ac=hl.int(ds[f"AC_{snp}_gen"]),
                            an=hl.int(ds[f"AN_{snp}_gen"]),
                        ),
                    ),
                ),
                ds[f"{snp}_copy"].split("-"),
            )
            for snp in ["snp1", "snp2", "snp3"]
        ]
    )

    ds = ds.annotate(constituent_snv_ids=[ds.snp1, ds.snp2, ds.snp3])

    ds = ds.annotate(
        mnv_in_exome=ds.constituent_snvs.all(lambda s: hl.is_defined(s.exome)),
        mnv_in_genome=ds.constituent_snvs.all(lambda s: hl.is_defined(s.genome)),
    )

    ds = ds.transmute(
        n_individuals=ds.n_indv_tnv,
        ac=ds.AC_tnv,
        ac_hom=ds.n_tnv_hom,
        exome=hl.or_missing(
            ds.mnv_in_exome,
            hl.struct(
                n_individuals=ds.n_indv_tnv_ex, ac=ds.AC_tnv_ex, ac_hom=ds.n_tnv_hom_ex
            ),
        ),
        genome=hl.or_missing(
            ds.mnv_in_genome,
            hl.struct(
                n_individuals=ds.n_indv_tnv_gen,
                ac=ds.AC_tnv_gen,
                ac_hom=ds.n_tnv_hom_gen,
            ),
        ),
    )

    ds = ds.drop("AC_snp1", "AC_snp2", "AC_snp3")

    ds = ds.transmute(
        consequence=hl.struct(
            category=hl.null(hl.tstr),
            gene_id=ds.gene_id,
            gene_name=ds.gene_name,
            transcript_id=ds.transcript_id,
            consequence=ds.tnv_cons,
            codons=ds.tnv_codons,
            amino_acids=ds.tnv_amino_acids,
            lof=ds.tnv_lof,
            snv_consequences=[
                hl.struct(
                    variant_id=ds[f"{snp}"],
                    amino_acids=ds[f"{snp}_amino_acids"],
                    codons=ds[f"{snp}_codons"],
                    consequence=ds[f"{snp}_cons"],
                    lof=ds[f"{snp}_lof"],
                )
                for snp in ["snp1", "snp2", "snp3"]
            ],
        )
    )

    ds = ds.drop(
        *list(
            f"snp{pair}_mnv_{field}"
            for pair, field in itertools.product(
                ["12", "23", "13"],
                [
                    "cons",
                    "codons",
                    "amino_acids",
                    "lof",
                    "categ",
                    "n_indv_ex",
                    "n_indv_gen",
                ],
            )
        )
    )

    # Collapse table to one row per MNV, with all consequences for the MNV collected into an array
    consequences = ds.group_by(ds.mnv).aggregate(
        consequences=hl.agg.collect(ds.consequence)
    )
    ds = ds.drop("consequence")
    ds = ds.distinct()
    ds = ds.join(consequences)

    # Sort consequences by severity
    ds = ds.annotate(
        consequences=hl.sorted(
            ds.consequences,
            key=lambda c: CONSEQUENCE_TERM_RANK_LOOKUP.get(c.consequence),
        )
    )

    ds = ds.annotate(
        changes_amino_acids_for_snvs=hl.literal([0, 1, 2])
        .filter(
            lambda idx: ds.consequences.any(
                lambda csq: csq.snv_consequences[idx].amino_acids.lower()
                != csq.amino_acids.lower()
            )
        )
        .map(lambda idx: ds.constituent_snv_ids[idx])
    )

    return ds


def replace_quote_char(path):
    # Change field quote character from double quotes to single quotes.
    # Work around for hail-is/hail#5796 to import filter columns as arrays.
    # Requires that args.mnv_url point to a local file.
    with open(path, "r") as fin:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".tsv", dir=".", delete=False
        ) as fout:
            reader = csv.reader(fin, delimiter="\t")
            writer = csv.writer(fout, delimiter="\t", quotechar="'")
            for row in reader:
                writer.writerow(row)

            return fout.name


mnvs = import_mnv_file(replace_quote_char(args.mnv_url), quote="'")

if args.three_bp_mnv_url:
    mnvs_3bp = import_three_bp_mnv_file(
        replace_quote_char(args.three_bp_mnv_url), quote="'"
    )

    snp12_components = mnvs_3bp.select(
        component_mnv=hl.bind(
            lambda snv1, snv2: hl.delimit(
                [
                    snv1.chrom,
                    hl.str(snv1.pos),
                    snv1.ref + snv2.ref,
                    snv1.alt + snv2.alt,
                ],
                "-",
            ),
            mnvs_3bp.constituent_snvs[0],
            mnvs_3bp.constituent_snvs[1],
        ),
        related_mnv=hl.struct(
            combined_variant_id=mnvs_3bp.variant_id,
            n_individuals=mnvs_3bp.n_individuals,
            other_constituent_snvs=[mnvs_3bp.constituent_snvs[2].variant_id],
            consequences=mnvs_3bp.consequences,
        ),
    )
    snp23_components = mnvs_3bp.select(
        component_mnv=hl.bind(
            lambda snv2, snv3: hl.delimit(
                [
                    snv2.chrom,
                    hl.str(snv2.pos),
                    snv2.ref + snv3.ref,
                    snv2.alt + snv3.alt,
                ],
                "-",
            ),
            mnvs_3bp.constituent_snvs[1],
            mnvs_3bp.constituent_snvs[2],
        ),
        related_mnv=hl.struct(
            combined_variant_id=mnvs_3bp.variant_id,
            n_individuals=mnvs_3bp.n_individuals,
            other_constituent_snvs=[mnvs_3bp.constituent_snvs[0].variant_id],
            consequences=mnvs_3bp.consequences,
        ),
    )
    snp13_components = mnvs_3bp.select(
        component_mnv=hl.bind(
            lambda snv1, snv2, snv3: hl.delimit(
                [
                    snv1.chrom,
                    hl.str(snv1.pos),
                    snv1.ref + snv2.ref + snv3.ref,
                    snv1.alt + snv2.ref + snv3.alt,
                ],
                "-",
            ),
            mnvs_3bp.constituent_snvs[0],
            mnvs_3bp.constituent_snvs[1],
            mnvs_3bp.constituent_snvs[2],
        ),
        related_mnv=hl.struct(
            combined_variant_id=mnvs_3bp.variant_id,
            n_individuals=mnvs_3bp.n_individuals,
            other_constituent_snvs=[mnvs_3bp.constituent_snvs[1].variant_id],
            consequences=mnvs_3bp.consequences,
        ),
    )
    component_2bp_mnvs = snp12_components.union(snp13_components).union(
        snp23_components
    )
    component_2bp_mnvs = component_2bp_mnvs.group_by(
        component_2bp_mnvs.component_mnv
    ).aggregate(related_mnvs=hl.agg.collect(component_2bp_mnvs.related_mnv))

    mnvs = mnvs.annotate(related_mnvs=component_2bp_mnvs[mnvs.variant_id].related_mnvs)
    mnvs = mnvs.annotate(
        related_mnvs=mnvs.related_mnvs.map(
            lambda related_mnv: related_mnv.select(
                "combined_variant_id",
                "n_individuals",
                "other_constituent_snvs",
                changes_amino_acids=hl.bind(
                    lambda mnv_consequences, related_mnv_consequences: mnv_consequences.key_set()
                    .union(related_mnv_consequences.key_set())
                    .any(
                        lambda gene_id: mnv_consequences.get(gene_id)
                        != related_mnv_consequences.get(gene_id)
                    ),
                    hl.dict(
                        mnvs.consequences.map(
                            lambda c: (c.gene_id, c.amino_acids.lower())
                        )
                    ),
                    hl.dict(
                        related_mnv.consequences.map(
                            lambda c: (c.gene_id, c.amino_acids.lower())
                        )
                    ),
                ),
            )
        )
    )

    mnvs_3bp = mnvs_3bp.annotate(
        related_mnvs=hl.empty_array(mnvs.related_mnvs.dtype.element_type)
    )

    mnvs = mnvs.union(mnvs_3bp)

mnvs = mnvs.repartition(8, shuffle=True)

mnvs = mnvs.key_by()

mnvs.write(args.output_url)

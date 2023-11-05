import itertools

import hail as hl


def x_position(chrom, position):
    contig_number = (
        hl.case().when(chrom == "X", 23).when(chrom == "Y", 24).when(chrom[0] == "M", 25).default(hl.int(chrom))
    )
    return hl.int64(contig_number) * 1_000_000_000 + position


FREQ_FIELDS = ["SC", "SN", "SF"]
POPULATIONS = ["afr", "amr", "asj", "eas", "fin", "mid", "nfe", "sas"]
DIVISIONS = list(
    itertools.chain.from_iterable(
        [(pop, pop), (f"{pop}_XX", f"{pop}_FEMALE"), (f"{pop}_XY", f"{pop}_MALE")] for pop in POPULATIONS
    )
) + [("XX", "FEMALE"), ("XY", "MALE")]


def prepare_gnomad_v4_cnvs(vcf_path):
    ds = hl.import_vcf(vcf_path, force_bgz=True, min_partitions=32, reference_genome="GRCh38").rows()

    ds = ds.annotate(
        variant_id=ds.rsid.replace("^GD_", "").replace("^variant_is_80_", ""),
        reference_genome="GRCh38",
        # Start
        chrom=ds.locus.contig.replace("chr", ""),
        pos=ds.locus.position,
        # End
        end=ds.info.END,
        # Other
        length=ds.info.SVLEN,
        type=ds.info.SVTYPE,
        alts=ds.alleles[1:],
    )

    ds = ds.annotate(
        xpos=x_position(ds.chrom, ds.pos),
        xend=x_position(ds.chrom, ds.end),
    )

    ds = ds.annotate(genes=hl.set(hl.array(hl.str(ds.info.Genes).split(","))))

    ds = ds.annotate(
        freq=hl.struct(
            **{field.lower(): ds.info[field] for field in FREQ_FIELDS},
            populations=[
                hl.struct(id=pop_id, **{field.lower(): ds.info[f"{pop_key}_{field}"] for field in FREQ_FIELDS})
                for (pop_id, pop_key) in DIVISIONS
            ],
        )
    )

    ds = ds.key_by("variant_id")

    ds = ds.annotate(
        posmin=ds.info.POSMIN,
        posmax=ds.info.POSMAX,
        endmin=ds.info.ENDMIN,
        endmax=ds.info.ENDMAX,
    )

    ds = ds.drop("locus", "alleles", "info", "rsid")
    return ds

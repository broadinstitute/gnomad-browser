import hail as hl

TWO_HET_DATA_PATH = "gs://gcp-public-data--gnomad/release/2.1.1/secondary_analyses/variant_cooccurrence/gnomAD_v2_two_heterozygous_rare_variants_table_for_download.tsv"
HOMOZYGOUS_DATA_PATH = "gs://gcp-public-data--gnomad/release/2.1.1/secondary_analyses/variant_cooccurrence/gnomAD_v2_homozygous_rare_variants_table_for_download.tsv"

AF_CUTOFF_MAPPING = hl.literal(
    {
        "1.0000e-02": "af_cutoff_0_01",
        "1.0000e-03": "af_cutoff_0_001",
        "1.0000e-04": "af_cutoff_0_0001",
        "1.0000e-05": "af_cutoff_0_00001",
        "1.5000e-02": "af_cutoff_0_015",
        "2.0000e-02": "af_cutoff_0_02",
        "5.0000e-02": "af_cutoff_0_05",
        "5.0000e-03": "af_cutoff_0_005",
        "5.0000e-04": "af_cutoff_0_0005",
        "5.0000e-05": "af_cutoff_0_00005",
    }
)

HETEROZYGOUS_AF_CUTOFFS_TO_EXPORT = hl.literal(
    ["af_cutoff_0_05", "af_cutoff_0_02", "af_cutoff_0_015", "af_cutoff_0_01", "af_cutoff_0_005"]
)
HOMOZYGOUS_AF_CUTOFFS_TO_EXPORT = hl.literal(["af_cutoff_0_05", "af_cutoff_0_01", "af_cutoff_0_005"])


def prepare_variant_cooccurrence_counts(tsv_path, field_name_map):
    key_field_types = {"gene_id": hl.tstr, "csq": hl.tstr, "af_threshold": hl.tstr}
    input_field_types = dict(map(lambda field_name: (field_name, hl.tint), field_name_map.values()))

    result = hl.import_table(
        tsv_path,
        types={**key_field_types, **input_field_types},
        key=["gene_id"],
        min_partitions=100,
    )
    result = result.transmute(af_cutoff=AF_CUTOFF_MAPPING[result.af_threshold])
    result = result.key_by("gene_id", "csq", "af_cutoff")
    struct_schema = {
        processed_field_name: result[result.gene_id, result.csq, result.af_cutoff][raw_field_name]
        for (processed_field_name, raw_field_name) in field_name_map.items()
    }
    result = result.annotate(counts=hl.struct(**struct_schema))
    result = result.select("counts")
    return result


def prepare_heterozygous_variant_cooccurrence_counts():
    field_name_map = {
        "in_cis": "n_same_hap_without_chet_or_unphased",
        "in_trans": "n_chet",
        "unphased": "n_unphased_without_chet",
        "two_het_total": "n_any_het_het",
    }
    return prepare_variant_cooccurrence_counts(TWO_HET_DATA_PATH, field_name_map)


def prepare_homozygous_variant_cooccurrence_counts():
    field_name_map = {"hom_total": "n_hom"}
    return prepare_variant_cooccurrence_counts(HOMOZYGOUS_DATA_PATH, field_name_map)


def aggregate_counts(counts):
    result = counts.key_by(counts.gene_id)
    result = result.transmute(counts=hl.struct(csq=result.csq, af_cutoff=result.af_cutoff, data=result.counts))
    result = result.group_by(result.gene_id).aggregate(counts=hl.agg.collect(result.counts))
    return result


def filter_by_af_cutoff(counts, af_cutoffs):
    return counts.filter(af_cutoffs.contains(counts.af_cutoff))


def annotate_table_with_variant_cooccurrence_counts(
    genes_path=None,
    heterozygous_variant_cooccurrence_counts_path=None,
    homozygous_variant_cooccurrence_counts_path=None,
):
    genes = hl.read_table(genes_path)

    heterozygous_variant_cooccurrence_counts = hl.read_table(heterozygous_variant_cooccurrence_counts_path)
    heterozygous_variant_cooccurrence_counts = filter_by_af_cutoff(
        heterozygous_variant_cooccurrence_counts, HETEROZYGOUS_AF_CUTOFFS_TO_EXPORT
    )
    heterozygous_variant_cooccurrence_counts = aggregate_counts(heterozygous_variant_cooccurrence_counts)

    homozygous_variant_cooccurrence_counts = hl.read_table(homozygous_variant_cooccurrence_counts_path)
    homozygous_variant_cooccurrence_counts = filter_by_af_cutoff(
        homozygous_variant_cooccurrence_counts, HOMOZYGOUS_AF_CUTOFFS_TO_EXPORT
    )
    homozygous_variant_cooccurrence_counts = aggregate_counts(homozygous_variant_cooccurrence_counts)

    genes = genes.annotate(
        heterozygous_variant_cooccurrence_counts=heterozygous_variant_cooccurrence_counts[genes.gene_id]["counts"],
        homozygous_variant_cooccurrence_counts=homozygous_variant_cooccurrence_counts[genes.gene_id]["counts"],
    )
    return genes

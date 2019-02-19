#!/usr/bin/env python3
import argparse
import csv
import re
from collections import namedtuple

import hail as hl
from tqdm import tqdm


p = argparse.ArgumentParser()
p.add_argument("input_ht", help="Path to Hail table with base-level data")
p.add_argument("output_ht", help="Path to output Hail table with region-level data")
args = p.parse_args()

tissue_map = {
    "Adipose_Subcutaneous": "adipose_subcutaneous",
    "Adipose_Visceral_Omentum_": "adipose_visceral_omentum",
    "AdrenalGland": "adrenal_gland",
    "Artery_Aorta": "artery_aorta",
    "Artery_Coronary": "artery_coronary",
    "Artery_Tibial": "artery_tibial",
    "Bladder": "bladder",
    "Brain_Amygdala": "brain_amygdala",
    "Brain_Anteriorcingulatecortex_BA24_": "brain_anterior_cingulate_cortex_ba24",
    "Brain_Caudate_basalganglia_": "brain_caudate_basal_ganglia",
    "Brain_CerebellarHemisphere": "brain_cerebellar_hemisphere",
    "Brain_Cerebellum": "brain_cerebellum",
    "Brain_Cortex": "brain_cortex",
    "Brain_FrontalCortex_BA9_": "brain_frontal_cortex_ba9",
    "Brain_Hippocampus": "brain_hippocampus",
    "Brain_Hypothalamus": "brain_hypothalamus",
    "Brain_Nucleusaccumbens_basalganglia_": "brain_nucleus_accumbens_basal_ganglia",
    "Brain_Putamen_basalganglia_": "brain_putamen_basal_ganglia",
    "Brain_Spinalcord_cervicalc_1_": "brain_spinal_cord_cervical_c_1",
    "Brain_Substantianigra": "brain_substantia_nigra",
    "Breast_MammaryTissue": "breast_mammary_tissue",
    "Cells_EBV_transformedlymphocytes": "cells_ebv_transformed_lymphocytes",
    "Cells_Transformedfibroblasts": "cells_transformed_fibroblasts",
    "Cervix_Ectocervix": "cervix_ectocervix",
    "Cervix_Endocervix": "cervix_endocervix",
    "Colon_Sigmoid": "colon_sigmoid",
    "Colon_Transverse": "colon_transverse",
    "Esophagus_GastroesophagealJunction": "esophagus_gastroesophageal_junction",
    "Esophagus_Mucosa": "esophagus_mucosa",
    "Esophagus_Muscularis": "esophagus_muscularis",
    "FallopianTube": "fallopian_tube",
    "Heart_AtrialAppendage": "heart_atrial_appendage",
    "Heart_LeftVentricle": "heart_left_ventricle",
    "Kidney_Cortex": "kidney_cortex",
    "Liver": "liver",
    "Lung": "lung",
    "MinorSalivaryGland": "minor_salivary_gland",
    "Muscle_Skeletal": "muscle_skeletal",
    "Nerve_Tibial": "nerve_tibial",
    "Ovary": "ovary",
    "Pancreas": "pancreas",
    "Pituitary": "pituitary",
    "Prostate": "prostate",
    "Skin_NotSunExposed_Suprapubic_": "skin_not_sun_exposed_suprapubic",
    "Skin_SunExposed_Lowerleg_": "skin_sun_exposed_lower_leg",
    "SmallIntestine_TerminalIleum": "small_intestine_terminal_ileum",
    "Spleen": "spleen",
    "Stomach": "stomach",
    "Testis": "testis",
    "Thyroid": "thyroid",
    "Uterus": "uterus",
    "Vagina": "vagina",
    "WholeBlood": "whole_blood",
}

tissue_fields = list(tissue_map.values())

#
# Step 1: rename fields, extract chrom/pos from locus, convert missing values to 0, export to TSV
#
ds = hl.read_table(args.input_ht)
ds = ds.repartition(64)

n_bases = ds.count()
ds = ds.select(
    gene_id=ds.ensg,
    chrom=ds.locus.contig,
    pos=ds.locus.position,
    # Replace NaNs and missing values with 0s
    mean=hl.cond(hl.is_missing(ds.mean_proportion) | hl.is_nan(ds.mean_proportion), hl.float(0), ds.mean_proportion),
    **{
        renamed: hl.cond(hl.is_missing(ds[original]) | hl.is_nan(ds[original]), hl.float(0), ds[original])
        for original, renamed in tissue_map.items()
    }
)

ds = ds.order_by(ds.gene_id, hl.asc(ds.pos)).drop("locus")
ds.export("bases.tsv")

#
# Step 2: Collect base-level data into regions
#
Row = namedtuple("Row", ["gene", "chrom", "pos", "tissues"])
Region = namedtuple("Region", ["gene", "chrom", "start", "stop", "tissues"])


def read_bases_tsv(filename):
    with open(filename) as f:
        reader = csv.reader(f, delimiter="\t")
        header_row = next(reader)
        tissue_names = header_row[3:]
        for row in reader:
            tissues = dict(zip(tissue_names, [float(v) for v in row[3:]]))
            yield Row(gene=row[0], chrom=row[1], pos=int(row[2]), tissues=tissues)


with open("regions.tsv", "w") as output_file:
    writer = csv.writer(output_file, delimiter="\t")
    writer.writerow(["gene_id", "chrom", "start", "stop", "mean"] + tissue_fields)

    def output_region(region):
        writer.writerow(
            [region.gene, region.chrom, region.start, region.stop, region.tissues["mean"]]
            + [region.tissues[t] for t in tissue_fields]
        )

    rows = read_bases_tsv("bases.tsv")
    first_row = next(rows)
    current_region = Region(
        gene=first_row.gene, chrom=first_row.chrom, start=first_row.pos, stop=None, tissues=first_row.tissues
    )
    last_pos = first_row.pos

    for row in tqdm(rows, total=n_bases):
        if (
            row.gene != current_region.gene
            or row.chrom != current_region.chrom
            or row.pos > (last_pos + 1)
            or any(row.tissues[t] != current_region.tissues[t] for t in row.tissues)
        ):
            output_region(current_region._replace(stop=last_pos))
            current_region = Region(gene=row.gene, chrom=row.chrom, start=row.pos, stop=None, tissues=row.tissues)

        last_pos = row.pos

    output_region(current_region._replace(stop=last_pos))


#
# Step 3: Convert regions to a Hail table.
#
types = {t: hl.tfloat for t in tissue_fields}
types["gene_id"] = hl.tstr
types["chrom"] = hl.tstr
types["start"] = hl.tint
types["stop"] = hl.tint
types["mean"] = hl.tfloat

ds = hl.import_table("regions.tsv", min_partitions=100, missing="", types=types)

ds = ds.select("gene_id", "chrom", "start", "stop", "mean", tissues=hl.struct(**{t: ds[t] for t in tissue_fields}))

ds.write(args.output_ht)

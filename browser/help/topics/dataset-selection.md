---
id: dataset-selection
title: 'Dataset selection'
---

The data selection drop-down specifies which dataset is displayed on the page. It also updates accompanying data such as the coverage plot, constraint statistics, regional constraint, and variant positional distribution plot, when available.

In the past, the gnomAD browser has supported disease-specific subsets (e.g. non-cancer). However, **we have decided to no longer create these subsets in v4 and will begin to phase out support for all subsets in the browser in 2024**. We made the decision to remove support for subsets from the gnomAD v4 exomes for two reasons: sample metadata and sample size. While we are provided high level study phenotype and case/control status for some samples, **we do not have comprehensive phenotype metadata for gnomAD samples**, and many samples are now derived from large biobanks, which can include individuals with disease. As such, we cannot ensure that samples in a non-disease subset do not have the specified disease. Additionally, as the dataset has grown, concerns about enrichment of any particular phenotype decreases. And finally, we continue to remove cohorts recruited for severe pediatric disease and have also removed the TCGA cancer samples due to data quality. For a more detailed understanding of the cohorts included in gnomAD, please see the “Study Diseases in gnomAD” table [on our stats page](/stats#study-diseases-in-gnomad). In summary, we encourage our users to check frequencies across the full dataset to fully leverage the scale and power of gnomAD data.

Note that gnomAD v4.1 has a single subset (non-UK Biobank). This subset only impacts the gnomAD exomes (does not impact frequencies of the gnomAD genomes).

The following subsets from previous versions are currently available, but access to these subsets will change in 2024. Those subsets that will be continued to be supported in the browser and available on our downloads page are indicated in bold, those that will be moved to download only in early 2024 are in italics.

### Short variants

#### gnomAD v4.1

- **gnomAD v4.1**
- gnomAD v4.1 (non-UKB): Subset of the gnomAD exomes that contains only samples that are not present in the UK Biobank (UKB) 455,000 exome release. The allele counts in this subset can thus be added to those of UKB to enable federated use of both datasets.

#### gnomAD v4.0

**gnomAD v4.0**
- gnomAD v4.0 (non-UKB): Subset of the gnomAD exomes that contains only samples that are not present in the UK Biobank (UKB) 455,000 exome release. The allele counts in this subset can thus be added to those of UKB to enable federated use of both datasets. ([Download only](/downloads#v4))

#### gnomAD v3.1.2

- **gnomAD v3.1.2**
- _gnomAD v3.1.2 (non-cancer): Only samples from individuals who were not ascertained for having cancer in a cancer study._
- _gnomAD v3.1.2 (non-neuro): Only samples that were not collected as part of a neurologic or psychiatric case/control study, or samples collected as part of a neurologic or psychiatric case/control study but designated as controls._
- _gnomAD v3.1.2 (non-v2): Only samples that are new to the v3 or v3.1 release and not included in gnomAD v2._
- _gnomAD v3.1.2 (non-TOPMed): Only samples that are not present in the Trans-Omics for Precision Medicine (TOPMed)/BRAVO release. The allele counts in this subset can thus be added to those of BRAVO to enable federated use of both datasets._
- _gnomAD v3.1.2 (controls/biobanks): Only samples collected specifically as controls for disease studies, or samples belonging to biobanks (e.g. BioMe, Genizon) or general population studies (e.g., 1000 Genomes, HGDP, PAGE)._

#### gnomAD v2.1.1

- **gnomAD v2.1.1**
- _gnomAD v2.1.1 (non-TOPMed): Only samples that are not present in the Trans-Omics for Precision Medicine (TOPMed)/BRAVO release. The allele counts in this subset can thus be added to those of BRAVO to federate both datasets._
- _gnomAD v2.1.1 (non-cancer): Only samples from individuals who were not ascertained for having cancer in a cancer study._
- _gnomAD v2.1.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study._
- _gnomAD v2.1.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease._

#### ExAC

- _ExAC v1.0_

### Structural variants

#### v4

- **gnomAD genome SVs v4.1**: Structural variant (SV) calls generated from a set of GS samples that largely overlaps those in gnomAD v4. This current SV release includes 63,046 unrelated genomes. See the [gnomAD-SV blog post](https://gnomad.broadinstitute.org/news/2023-11-v4-structural-variants) for details.
- gnomAD genome SVs v4.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study. ([Download only](/downloads#v4))
- gnomAD genome SVs v4.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease. ([Download only](/downloads#v4))
- **gnomAD exome CNVs v4.1**: Copy number variant (CNV) calls generated from a set of ES samples that largely overlaps those in gnomAD v4. This current CNV release includes 464,297 unrelated exomes.
- gnomAD exome CNVs v4.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study. ([Download only](/downloads#v4))
- gnomAD exome CNVs v4.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease. ([Download only](/downloads#v4))
- gnomAD SVs v2.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease.

#### v2

- _gnomAD SVs v2.1: Structural variant (SV) calls generated from a set of GS samples that largely overlaps those in gnomAD v2.1. This current SV release includes 10,847 unrelated genomes. See the [gnomAD-SV paper](https://broad.io/gnomad_sv) for details._
- _gnomAD SVs v2.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study._
- _gnomAD SVs v2.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease._

The data selection drop-down also updates accompanying data such as the coverage plot, constraint statistics, regional constraint, and variant positional distribution plot.

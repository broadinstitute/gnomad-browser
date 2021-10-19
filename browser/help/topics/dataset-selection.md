---
id: dataset-selection
title: 'Dataset selection'
---

The data selection drop-down specifies which dataset is displayed on the page. Currently these are:

### Short variants

#### gnomAD v3.1.2

+ gnomAD v3.1.2
+ gnomAD v3.1.2 (non-cancer): Only samples from individuals who were not ascertained for having cancer in a cancer study.
+ gnomAD v3.1.2 (non-neuro): Only samples that were not collected as part of a neurologic or psychiatric case/control study, or samples collected as part of a neurologic or psychiatric case/control study but designated as controls.
+ gnomAD v3.1.2 (non-v2): Only samples that are new to the v3 or v3.1 release and not included in gnomAD v2.
+ gnomAD v3.1.2 (non-TOPMed): Only samples that are not present in the Trans-Omics for Precision Medicine (TOPMed)/BRAVO release. The allele counts in this subset can thus be added to those of BRAVO to enable federated use of both datasets.
+ gnomAD v3.1.2 (controls/biobanks): Only samples collected specifically as controls for disease studies, or samples belonging to biobanks (e.g. BioMe, Genizon)  or general population studies (e.g., 1000 Genomes, HGDP, PAGE).

#### gnomAD v2.1.1

+ gnomAD v2.1.1
+ gnomAD v2.1.1 (non-TOPMed): Only samples that are not present in the Trans-Omics for Precision Medicine (TOPMed)/BRAVO release. The allele counts in this subset can thus be added to those of BRAVO to federate both datasets.
+ gnomAD v2.1.1 (non-cancer): Only samples from individuals who were not ascertained for having cancer in a cancer study.
+ gnomAD v2.1.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study.
+ gnomAD v2.1.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease.

#### ExAC

+ ExAC v1.0

### Structural variants

+ gnomAD SVs v2.1: Structural variant (SV) calls generated from a set of WGS samples that largely overlaps those in gnomAD v2.1. This current SV release includes 10,847 unrelated genomes. See the [gnomAD-SV paper](https://broad.io/gnomad_sv) for details.
+ gnomAD SVs v2.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study.
+ gnomAD SVs v2.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease.

The data selection drop-down also updates accompanying data such as the coverage plot, constraint statistics, regional constraint, and variant positional distribution plot.

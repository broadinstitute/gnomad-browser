---
title: 'Dataset selection'
---

# Selecting datasets

The data selection drop-down specifies which dataset is displayed on the page. Currently these are:

## Short variants

+ gnomAD v3.0
+ gnomAD v2.1.1
+ gnomAD v2.1.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease.
+ gnomAD v2.1.1 (non-cancer): Only samples from individuals who were not ascertained for having cancer in a cancer study.
+ gnomAD v2.1.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study.
+ gnomAD v2.1.1 (non-TOPMed): Only samples that are not present in the Trans-Omics for Precision Medicine (TOPMed)/BRAVO release. The allele counts in this subset can thus be added to those of BRAVO to federate both datasets.
+ ExAC v1.0: same data from [exac.broadinstitute.org](http://exac.broadinstitute.org)

## Structural variants

+ gnomAD SVs v2.1: Structural variant (SV) calls generated from a set of WGS samples that largely overlaps those in gnomAD v2.1. This current SV release includes 10,847 unrelated genomes. See the [gnomAD-SV preprint](https://broad.io/gnomad_sv) for details.
+ gnomAD SVs v2.1 (controls): Only samples from individuals who were not selected as a case in a case/control study of common disease.
+ gnomAD SVs v2.1 (non-neuro): Only samples from individuals who were not ascertained for having a neurological condition in a neurological case/control study.

The data selection drop-down also updates accompanying data such as the coverage plot, constraint statistics, regional constraint, and variant positional distribution plot.

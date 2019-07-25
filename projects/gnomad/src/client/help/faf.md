---
index: gnomad_help
title: 'Filtering allele frequency'
---

#  Filtering allele frequency

This annotation contains a threshold filter allele frequency for a variant. 
Technically, this is the highest disease-specific maximum credible population AF for which the observed AC is not compatible with pathogenicity. 
More practically, If the filter allele frequency of a variant is above the maximum credible population AF for a condition of interest, then that variant should be filtered (ie not considered a candidate causative variant).
See http://cardiodb.org/allelefrequencyapp/ and [Whiffin _et al._ 2017](https://www.nature.com/articles/gim201726) for additional information. 

On the browser, this annotation is available on the variant page and gives the 95%.
In the VCF and Hail tables, this annotation is computed globally and for each population separately and two thresholds are available for each population: 95% CI and 99% CI.

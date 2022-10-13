---
id: genomic-constraint
title: 'Genomic constraint'
---

### Overall interpretation

A genomic constraint metric is now available on the gnomAD browser.

We quantify the depletion of variation (constraint) at a 1kb scale with a signed Z score by comparing the observed variation to an expectation. In each tiling 1kb genomic region, the expected number of variants is predicted using an improved mutional model that takes into account both local sequence context and a variety of genomic features. A higher positive Z score (i.e., observing fewer variants than expectation) indicates higher constraint.

This genomic constraint metric is only available for the gnomAD v3 dataset, as it is based on GRCh38. The track only displays if the region is 150kb or less, and the Z scores render as text in the track if the scale allows. Gaps in the genomic constract track represent regions that did not pass QC.

More details can be found in the [preprint on bioRxiv](https://www.biorxiv.org/content/10.1101/2022.03.20.485034v2).

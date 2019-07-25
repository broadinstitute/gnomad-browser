---
index: gnomad_help
title: 'Annotations in gnomAD'
---

#  Annotations

## VEP

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 85 using Gencode v19 on GRCh37, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

## LOFTEE

LOFTEE considers all stop-gained, splice-disrupting, and frameshift variants, and filters out many known false-positive modes, such as variants near the end of transcripts and in non-canonical splice sites, as described in the [code documentation](https://github.com/konradjk/loftee). These variants are flagged on the gene page with "LC LoF" and on the variant page in the Annotations section: however, as these annotations are transcript specific, you may need to click on the "Transcripts" box in order to observe the annotation for each particular transcript.

## MNVs

Multi-nucleotide variants (MNVs) were identified using a custom script (written by Emma Pierce-Hoffman and Andrew Hill). Briefly, this script took variant and phase information from the VCF to discover sites where two or three variants occur on the same haplotype within a single codon.

## LCR, SEGDUP and DECOY flags

Variants have been flagged according to whether they fall into low-complexity regions (LCRs) or segmental duplication (SEGDUP) regions.

For LCRs, these regions were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) at a score threshold of 30. The regions are available for download [here](https://console.cloud.google.com/storage/browser/gnomad-public/intervals/LCR.interval_list) and on Google Cloud Storage at: `gs://gnomad-public/intervals/LCR.interval_list`

The segmental duplications and decoy files we used are from the Global Alliance for Genomics and Health (GA4GH) Benchmarking Team and the Genome in a Bottle Consortium. Information on the source of these files can be found [here](https://github.com/ga4gh/benchmarking-tools/tree/master/resources/stratification-bed-files/SegmentalDuplications). The segmental duplication regions are also available for download [here](https://console.cloud.google.com/storage/browser/gnomad-public/intervals/hg19_self_chain_split_both.bed) and on on Google Cloud Storage at: `gs://gnomad-public/intervals/hg19_self_chain_split_both.bed`. The decoy regions can be downloaded [here](https://console.cloud.google.com/storage/browser/gnomad-public/intervals/mm-2-merged.GRCh37_compliant.bed) and on on Google Cloud Storage at: `gs://gnomad-public/intervals/mm-2-merged.GRCh37_compliant.bed`

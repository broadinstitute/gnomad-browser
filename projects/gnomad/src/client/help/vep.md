---
title: 'Annotations in gnomAD'
---

#  Annotations

## VEP
### gnomAD v3
Variants in the browser (and all current VCFs available for download) were annotated using VEP version 95 using Gencode v29 on GRCh38, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

### gnomAD v2
Variants in the browser (and all current VCFs available for download) were annotated using VEP version 85 using Gencode v19 on GRCh37, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

## LOFTEE

LOFTEE considers all stop-gained, splice-disrupting, and frameshift variants, and filters out many known false-positive modes, such as variants near the end of transcripts and in non-canonical splice sites, as described in the [code documentation](https://github.com/konradjk/loftee). These variants are flagged on the gene page with "LC pLoF" and on the variant page in the Annotations section: however, as these annotations are transcript specific, you may need to click on the "Transcripts" box in order to observe the annotation for each particular transcript.

## MNVs (gnomAD v2 only)

Multi-nucleotide variants (MNVs) were identified using
[Hail's window_by_locus](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.window_by_locus)
function. We exhaustively looked for variants that appear in the same individual, in the same haplotype, and within
2 bp distance for the exome dataset and 10 bp distance for the genome dataset. More information can be found in our
preprint ["Landscape of multi-nucleotide variants in 125,748 human exomes and 15,708 genomes"](https://www.biorxiv.org/content/10.1101/573378v2).

## LCR, SEGDUP and DECOY flags
### gnomAD v3
Variants have been flagged according to whether they fall into low-complexity regions (LCRs) regions.

These regions were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) on GRCh38 at a score threshold of 30. The regions are available for [download here](https://storage.googleapis.com/gnomad-public/resources/grch38/LCRFromHengHg38.txt)

### gnomAD v2
Variants have been flagged according to whether they fall into low-complexity regions (LCRs) or segmental duplication (SEGDUP) regions.

For LCRs, these regions were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) on  GRCh37 at a score threshold of 30. The regions are available for [download here](https://storage.googleapis.com/gnomad-public/intervals/LCR.interval_list)

The segmental duplications and decoy files we used are from the Global Alliance for Genomics and Health (GA4GH) Benchmarking Team and the Genome in a Bottle Consortium. Information on the source of these files can be found [here](https://github.com/ga4gh/benchmarking-tools/tree/master/resources/stratification-bed-files/SegmentalDuplications). The segmental duplication regions are also available for download [here](https://console.cloud.google.com/storage/browser/gnomad-public/intervals/hg19_self_chain_split_both.bed) and on on Google Cloud Storage at: `gs://gnomad-public/intervals/hg19_self_chain_split_both.bed`. The decoy regions can be downloaded [here](https://console.cloud.google.com/storage/browser/gnomad-public/intervals/mm-2-merged.GRCh37_compliant.bed) and on on Google Cloud Storage at: `gs://gnomad-public/intervals/mm-2-merged.GRCh37_compliant.bed`

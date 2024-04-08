---
id: vep
title: 'Annotations in gnomAD'
---

### gnomAD v4.1

#### VEP

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 105 using GENCODE v39 on GRCh38, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

#### <a name="loftee"></a>LOFTEE

LOFTEE considers all stop-gained, splice-disrupting, and frameshift variants, and filters out many known false-positive modes, such as variants near the end of transcripts and in non-canonical splice sites, as described in the [code documentation](https://github.com/konradjk/loftee). These variants are flagged on the gene page with "LC pLoF" and on the variant page in the Annotations section: however, as these annotations are transcript specific, you may need to click on the "Transcripts" box in order to observe the annotation for each particular transcript.

### LCR and SEGDUP flags

Variants have been flagged according to whether they fall into low-complexity regions (LCRs) or segmental duplication (SEGDUP) regions.

These [regions](https://storage.googleapis.com/gcp-public-data--gnomad/intervals/LCRFromHengHg38.bed) were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) on GRCh38 at a score threshold of 30.

The segmental duplication regions we used are from the Global Alliance for Genomics and Health (GA4GH) Benchmarking Team and the Genome in a Bottle Consortium. Information on the source of these files can be found in [GA4GH's benchmarking-tools GitHub repository](https://github.com/ga4gh/benchmarking-tools/tree/d88448a68a79ed322837bc8eb4d5a096a710993d/resources/stratification-bed-files/SegmentalDuplications).

<br/><br/>

<details>

<summary>Expand to see details for past versions</summary>

### VEP

#### gnomAD v3.1

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 101 using GENCODE v35 on GRCh38, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

#### gnomAD v3.0

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 95 using GENCODE v29 on GRCh38, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

#### gnomAD v2

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 85 using GENCODE v19 on GRCh37, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

### MNVs (gnomAD v2 only)

Multi-nucleotide variants (MNVs) were identified using [Hail's window_by_locus](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.window_by_locus) function. We exhaustively looked for variants that appear in the same individual, in the same haplotype, and within 2 bp distance for the exome dataset and 10 bp distance for the genome dataset. More information can be found in ["Landscape of multi-nucleotide variants in 125,748 human exomes and 15,708 genomes"](https://broad.io/gnomad_mnv).

### LCR, SEGDUP and DECOY flags

#### gnomAD v3

Variants have been flagged according to whether they fall into low-complexity regions (LCRs).

These [regions](https://storage.googleapis.com/gcp-public-data--gnomad/intervals/LCRFromHengHg38.bed) were identified
with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) on GRCh38 at a score threshold of 30.

#### gnomAD v2

Variants have been flagged according to whether they fall into low-complexity regions (LCRs) or segmental duplication (SEGDUP) regions.

[Low-complexity regions](https://storage.googleapis.com/gcp-public-data--gnomad/intervals/LCR.interval_list) were identified with the
[symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) on GRCh37 at a score threshold of 30.

The [segmental duplication](https://storage.googleapis.com/gcp-public-data--gnomad/intervals/hg19_self_chain_split_both.bed) and
[decoy](https://storage.googleapis.com/gcp-public-data--gnomad/intervals/mm-2-merged.GRCh37_compliant.bed) regions we used are from
the Global Alliance for Genomics and Health (GA4GH) Benchmarking Team and the Genome in a Bottle Consortium. Information on the source of these files can be found in [GA4GH's benchmarking-tools GitHub repository](https://github.com/ga4gh/benchmarking-tools/tree/d88448a68a79ed322837bc8eb4d5a096a710993d/resources/stratification-bed-files/SegmentalDuplications).

</details>

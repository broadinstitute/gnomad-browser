---
index: gnomad_help
title: 'Proportion expressed across transcripts (pext) score'
---

# Proportion expressed across transcripts (pext) score

The pext score, presented in the [2019 gnomAD companion preprint](https://www.biorxiv.org/content/10.1101/554444v1), summarizes isoform expression values accross tissues to allow for quick visualization of the expression status of exonic regions across tissues. 

Here, we have integrated pext values from the GTEx v7 dataset. To do so, we first compute the median expression of a transcript for GTEx tissue samples, and define the expression of a given base as the sum of the expression of all transcripts that touch that base as seen in the visualization below:
![visualization of pext score computation](pext.png)

We do this for every GTEx tissue, and then normalize the value by the expression of the gene in the tissue. This is the baselevel pext, which can be interpreted as a measure of the proportion of the total transcriptional output from a gene that would be affected by the position in question. It can also be thought of as an exon-usage type metric.

## How is this useful?
This visualization will show you how much an exonic region has evidence of expression accross tissues.

For example, you may find that there is no evidence of expression for a region in any GTEx tissues. We find that such regions often have low conservation and are enriched for annotation errors. In other cases, you may find a tissue-specific region carrying a variant of interest, which may be relevant to the clinical presentation of a carrier. 

## Important difference between annotation-level and base-level pext
For the base-level pext value, we sum the expression value of all transcripts that touch that base, whereas for an annotation-level we only sum the expression of transcripts on which a variant has a given annotation. For example for this toy variant: 

```
CHROM    POS   REF  ALT   CONSEQUENCES
  X     34242   C    T    ENST1: missense,
                          ENST2: missense,
                          ENST3: stop_gained
```
- The base-level pext value is the sum of the expression of ENST1, ENST2, and ENST3 divided by the gene expression value
- The annotation-level pext value is the sum of expression of ENST1 and ENST2 for the missense annotation, and the expression  of ENST3 for the stop gained annotation, each divided by the gene expression value. 

Therefore it's important to note that **the base-level pext value represents a maximum of the position, and will always be higher than the annotation-level pext value**. Therefore just because a position has a high base-level pext value doesn't mean a pLoF annotated at that position will have a high annotation-level pext value. 

## Caveats
We note that the pext values are derived from isoform quantifications using the RSEM tool. Isoform quantification tools can be imprecise, especially for longer genes with many annotated isoforms. While we have manually curated a set of regions with low pext values, and find that they are enriched for annotation errors, domain knowledge of a gene will outperform this summary metric (ie. there may be edge cases for which an exon that is established to be critical for gene function may appear unexpressed with pext). We also note that the GTEx dataset is postmortem adult tissue, and thus we cannot dismiss the probability that an exon may be development-specific or may be expressed in tissues not represented in GTEx.

Also note that for the browser, we have only added expression values for protein-coding (CDS) regions. While UTRs do have expression in transcriptome datasets, we do not include this information for the visualization. 

## More information
Check out our bioRxiv pre-print for details on development, validation and utility of pext values for interpretation. We also have a detailed [GitHub page](https://github.com/macarthur-lab/tx_annotation/) that outlines the commands to create these files, and includes steps to annotate your own variant file with pext values with any isoform expression matrix.

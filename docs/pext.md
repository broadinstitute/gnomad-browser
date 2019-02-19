
### Proportion expressed accross transcripts (pext) score in the gnomAD browser

The pext score, presented in the 2019 gnomAD companion preprint, summarizes isoform expression values accross tissues to allow for quick visualization of the expression status of exons across tissues. 

Here, we have integrated pext values from the GTEx v7 dataset. To do so, we first compute the median expression of a transcript across GTEx tissue samples, and define the expression of a given base as the sum of the expression of all transcripts that touch that base as seen in the visualization below:
![alt text](https://github.com/macarthur-lab/gnomad-docs/blob/master/docs/for_gnomad_browser.png)

We do this for every GTEx tissue, and then normalize the value by the expression of the gene in the tissue. This is the baselevel pext, which can be interpreted as a measure of the proportion of the total transcriptional output from a gene that would be affected by the position in question. In other words, it can be thought of as an exon-usage type metric.

#### How is this useful? 
This visualization will show you how much an exon is expressed accross tissues. 

For example, you may find that there is no evidence of expression for a region in any GTEx tissues. We find that such exons often have low conservation and are enriched for annotation errors. In other cases, you may find a tissue-specific exon carrying a variant of interest, which may be relevant to the clinical presentation of a carrier. 

#### Important difference between annotation-level and base-level pext 
For the base-level pext value, we sum the expression of all transcripts that touch that base, whereas for an annotation-level we only sum the expression of transcripts on which a variant has a given annotation. For example imagine a case where

```
CHROM    POS   REF  ALT   CONSEQUENCES
  X     34242   C    T    ENST1: missense,
                          ENST2: missense,
                          ENST3: stop_gained
```
- The base-level pext value is the sum of the expression of ENST1, ENST2, and ENST3 divided by the gene expression value
- The annotation-level pext value would be the sum of expression of ENST1 and ENST2 for the missense annotation, and the expression value of ENST for the stop gained annotation, each divided by the gene expression value. 

Therefore it's important to note that *the base-level pext value represents a maximum of the position, and will always be higher than the annotation-level pext value*. Therefore just because a position has a high base-level pext value doesn't mean a pLoF annotated at that position will have a high annotation-level pext value. 

#### Caveats
We note that the pext values are derived from isoform quantifications using the RSEM tool. Isoform quantification tools can be imprecise, especially for longer genes with many annotated isoforms. While we have manually curated a set of regions with low pext values, and find that they are enriched for annotation errors, domain knowledge of a gene will outperform this summary metric (ie. there may be edge cases for which an exon that is established to beritical for gene function may appear unexpressed in the browser). We also note that the GTEx v7 dataset is postmortem adult tissue, and thus we cannot dismiss the probability that an exon may be development-specific. 

#### More information 
Check out our biorXiv pre-print for details on development, validation and utility of pext values for interpretation. We also have a detailed [github page](https://github.com/macarthur-lab/tx_annotation/) that outlines the commands to create these files, and includes steps to annotate your own variant file with pext values with any isoform expression matrix. 


## Proportion expressed accross transcripts (pext) score in the gnomAD browser

The pext score, presented in the 2019 gnomAD companion preprint, summarizes isoform expression values accross tissues to allow for quick visualization of the expression status of exons across tissues. 

Here, we have integrated pext values from the GTEx v7 dataset. To do so, we first compute the median expression of a transcript across GTEx tissue samples, and define the expression of a given base as the sum of the expression of all transcripts that touch that base as seen in the visualization below:

![alt text](https://github.com/macarthur-lab/gnomad-docs/blob/master/docs/for_gnomad_browser.png)

We do this for every GTEx tissue, and then normalize the expression values by the expression of the gene in the tissue. This is the baselevel pext, which can be interpreted as a measure of the proportion of the total transcriptional output from a gene that would be affected by the variant annotation in question.

## Important difference between annotation-level and base-level pext 
For the base-level pext value, we sum the expression of all transcripts that touch that base, whereas for an annotation-level we only sum the expression of transcripts on which a variant has a given annotation. For example imagine a case where

```
chr1:32423  


## Caveats

## More information 

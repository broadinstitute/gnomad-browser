Manual review genotype quality scores are available for 4,819 out of 1,411,171 (0.3%) genotypes, and are based on manual review of read visualizations.
To select which genotypes to review for each locus, we started with the longest alleles at the tail of the allele size distribution and then
reviewed progressively shorter alleles either until we reached a natural stopping point, or until we had reviewed over 100 genotypes for that locus.
We looked for informative image features described in [[Dolzhenko 2022](https://pubmed.ncbi.nlm.nih.gov/35948990/)] and our [previous blog post](https://gnomad.broadinstitute.org/news/2022-01-the-addition-of-short-tandem-repeat-calls-to-gnomad/#supplemental-details-for-examining-read-visualizations) and recorded the genotype quality as:
* `High` - if the genotype appears to be accurate
* `Medium` - if the genotype is probably accurate, but there are indications that it might be wrong by 3 or more repeats
* `Low` - if the genotype is probably wrong by 3 or more repeats

For most loci, two people reviewed the genotypes, and the average of their responses was taken as the final genotype quality.

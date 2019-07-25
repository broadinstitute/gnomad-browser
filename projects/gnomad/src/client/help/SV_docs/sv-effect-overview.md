---
index: gnomad_help  
title: 'Structural variant consequences'  
---

# Genic consequences of structural variants  

We annotated each SV for multiple potential genic effects using an approach described in [the gnomAD SV preprint](https://broad.io/gnomad_sv).  In brief, this approach considers SV size, class, position, and overlap with exons from canonical transcripts of [Gencode v19](https://www.gencodegenes.org/human/release_19.html) protein-coding genes.

### Representation in the gnomAD Browser

The predicted functional impact of each SV is annotated in the `consequence` field of the Browser table. When querying a gene, SV consequences will be restricted to that gene. Otherwise, any consequence across any gene is considered for each SV.  

The functional consequence per SV was determined in the order below:

### Main functional consequences

  1. ![](https://placehold.it/15/D43925/000000?text=+) **Predicted loss-of-function (pLoF)**: SV is predicted to delete the gene or truncate the gene product.
  2. ![](https://placehold.it/15/7459B2/000000?text=+) **Intragenic exonic duplication (IED)**: SV is predicted to result in duplicated exons within the gene, without extending beyond the boundaries of the open reading frame.
  3. ![](https://placehold.it/15/2376B2/000000?text=+) **Copy gain (CG)**: SV is predicted to result in an entire additional intact copy of the gene.

### Other consequences

  4. **MCNV overlap**: MCNV overlaps one or more protein-coding exons; exact consequence depends on the number of copies and their orientation.
  5. **Partial duplication**: SV is predicted to partially duplicate the gene while leaving the original copy of the gene intact.
  6. **UTR**: SV does not directly disrupt coding sequence, but overlaps one of the gene's untranslated regions (UTRs).
  7. **Promoter**: SV does not directly disrupt coding sequence or promoter, but is within 2kb of the gene's transcription start site.
  8. **Inversion span**: gene is entirely spanned by an inversion SV without being directly disrupted.
  9. **Intronic**: SV does not directly disrupt coding sequence, but is wholly contained within an intron.
  10. **Intergenic**: SV does not meet any of the above categories.

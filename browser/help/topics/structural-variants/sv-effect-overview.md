---
id: sv-effect-overview
title: 'Genic consequences of structural variants'
---

We annotated each SV for multiple potential genic effects using an approach described in [the gnomAD SV paper](https://broad.io/gnomad_sv). In brief, this approach considers SV size, class, position, and overlap with exons from canonical transcripts of [GENCODE v19](https://www.gencodegenes.org/human/release_19.html) protein-coding genes.

### Representation in the gnomAD Browser

The predicted functional impact of each SV is annotated in the `consequence` field of the Browser table. When querying a gene, SV consequences will be restricted to that gene. Otherwise, any consequence across any gene is considered for each SV.

The functional consequence per SV was determined in the order below:

### Main functional consequences

1. ![](https://placehold.it/15/D43925/000000?text=+) **Predicted loss-of-function (pLoF)**: SV is predicted to delete the gene or truncate the gene product.
2. ![](https://placehold.it/15/7459B2/000000?text=+) **Intragenic exonic duplication (IED)**: SV is predicted to result in duplicated exons within the gene, without extending beyond the boundaries of the open reading frame. (New in gnomAD v4)
3. **Partial exon duplication (PED)**: SV is predicted to duplicate part of one or more exons without resulting in a whole-gene copy gain. (New in gnomAD v4)
4. ![](https://placehold.it/15/2376B2/000000?text=+) **Copy gain (CG)**: SV is predicted to result in an entire additional intact copy of the gene.

### Other consequences

4. **Transcription start site duplication**: SV is predicted to result in a duplication of a transcription start site but not result in any other, more severe consequences. (New in gnomAD v4).
5. **MCNV overlap**: MCNV overlaps one or more protein-coding exons; exact consequence depends on the number of copies and their orientation.

6. **Partial duplication**: SV is predicted to partially duplicate the gene while leaving the original copy of the gene intact.
7. **Exonic breakend**: breakend localizes to exonic locus, but consequence is unclear as SV is incompletely resolved. (New in gnomAD v4).
8. **UTR**: SV does not directly disrupt coding sequence, but overlaps one of the gene's untranslated regions (UTRs).
9. **Promoter**: SV does not directly disrupt coding sequence or promoter, but is within 2kb of the gene's transcription start site.
10. **Inversion span**: gene is entirely spanned by an inversion SV without being directly disrupted.
11. **Intronic**: SV does not directly disrupt coding sequence, but is wholly contained within an intron.
12. **Intergenic**: SV does not meet any of the above categories.

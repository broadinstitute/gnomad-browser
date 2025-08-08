---
id: ancestry
title: 'Genetic Ancestry in the OurDNA browser'
---

### Genetic ancestry groups

In the OurDNA browser we provide the following genetic ancestry groups:

#### Individuals recruited via the OurDNA program
More fine-grained community groupings are available for individuals recruited into OurDNA following participatory community engagement.
- Australian Filipino

#### Individuals recruited via other studies
Individuals included in the aggregated database but recruited via other studies are currently grouped into broader genetic ancestry regions
- African, African American, and African Caribbean
- Central and South Asian
- East and South East Asian
- European
- Middle Eastern and North African
- Unassigned

These groupings correspond to the harmonised groups proposed by [Koenig *et. al.*](https://pubmed.ncbi.nlm.nih.gov/38749656/), but modified in accordance with our attempts to minimise misinformation regarding genetic ancestry.

We emphasise that each of these genetic ancestry groups should be thought of as a grouping of *ancestries*, and that these groupings could be either too broad or too narrow with respect to the particular scientific question relevant to an analyst. See our forthcoming blog post on genetic ancestry for more details on our process and additional commentary on the benefits and limitations of using genetically-derived ancestry.

### Genetic ancestry identification

To define a set of high quality sites for genetic ancestry identification, we:
- Selected high-quality, unrelated (no second degree or closer relationships) individuals from the HGDP and 1000 Genomes Project reference callsets
- Filtered to exome calling regions
- Restricted to autosomal, bi-allelic sites that pass filtering in gnomAD v4.1 genomes
- Applied the following variant QC filters
    - AF > 0.0005
    - Inbreeding coefficient > -0.8
    - HWE p-value > 1e-8
    - Call rate > 99%  

For each callset (exomes and genomes) we separately subsetted to those pre-determined high-quality sites present in the callset, joined these with the HGDP and 1000 Genomes Project reference data, and computed the first 25 principal components across all high-quality, unrelated (no second degree or closer relationships) samples using the [`hwe_normalised_pca`](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca) function in hail.

We then train a random forest classifier on the reference samples using the PCs as features, selecting the number of principal components for inclusion based on hold-out test set accuracy, probability of group assignment, and manual inspection of the PCs. For this release, we used 12 PCs for exome ancestry assignment, and 14 PCs for genome ancestry assignment.

We assigned an ancestry label when the probability of group assignment was >= 0.8.

Any samples that we were unable to cluster using these probabilities were grouped into "Unassigned".

### Sub-group genetic ancestry identification and local ancestry
We have not performed genetic ancestry sub-group clustering nor local ancestry inference at this time, however this is on our roadmap for future releases.

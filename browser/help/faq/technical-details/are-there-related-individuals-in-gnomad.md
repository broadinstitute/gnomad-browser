---
question: 'Are there related individuals in gnomAD?'
---

Pairwise relatedness between samples was determined using [Hail's pc_relate](https://hail.is/docs/0.2/methods/genetics.html?highlight=pc_relate#hail.methods.pc_relate). We removed duplicate samples, first degree relatives, and second degree relatives to minimize inflation of rare variant frequencies. We always prioritize samples with higher quality metrics. In gnomAD v2, this was done on exomes and genomes combined, prioritizing genomes over exomes when selecting which individuals to include.

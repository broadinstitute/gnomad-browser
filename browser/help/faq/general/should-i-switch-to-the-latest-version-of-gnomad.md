---
question: 'Should I switch to the latest version of gnomAD?'
---

The gnomAD v2 call set contains fewer whole genomes than v3.1, but also contains a very large number of exomes that substantially increase its power as a reference in coding regions. Therefore gnomAD v2 is still our recommended dataset for most coding regions analyses. However, gnomAD v3.1 represents a very large increase in the number of genomes, and will therefore be a much better resource if your primary interest is in non-coding regions or if your coding region of interest is poorly captured in the gnomAD exomes (this can be assessed from the coverage plots in the browser). Most of the genomes from v2.1.1 are included in v3.1 and therefore these should not be considered as independent sample sets.

Another consideration when choosing which dataset to use is the ancestry of the samples you are interested in. gnomAD v3.1 contains a substantially larger number of African American samples than v2 (exomes and genomes combined) and provides allele frequencies in the Amish population for the first time. gnomAD v3.1 also has a fully genotyped callset available from the Human Genome Diversity Project and 1000 Genomes Project, representing > 60 distinct populations.

Finally, gnomAD v3.1 was mapped to GRCh38, so if your data is also on this build it probably makes sense to switch to v3.1. There is also a [liftover version of gnomAD v2.1.1](/downloads#v2-liftover-variants) onto GRCh38 available. We plan to produce a larger GRCh38 aligned exome callset in 2021.

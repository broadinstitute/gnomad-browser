---
id: sv-overview
title: 'Overview of structural variants in gnomAD'
---

### Background

Structural variants (SVs) are a form of genomic variation involving the gain, loss or rearrangement of at least 50 nucleotides.

SVs occur across numerous mutational classes, including gains and losses of genomic DNA (`copy number variants`/`CNVs or unbalanced` SVs), and dosage-neutral rearrangements of the linear genome sequence (known as `balanced` SVs).

Due to their size and disruptive nature, SVs can often result in alterations to coding sequences.

### Description of gnomAD SV data

The gnomAD v4 release has two SV data sets, 1) those detected in 63,046 unrelated genomes 2) and those detected in 464,297 exomes, the latter excluding common CNVs above 1%. In the gnomAD browser, we provide site, frequency, and annotation information for 1,199,117 high-quality SVs, as well as 66,903 high-quality rare coding CNVs. As with the gnomAD short variant data set, we have removed cohorts recruited for severe pediatric disease.

We have also produced VCF and BED files for both datasets, which are available via [the gnomAD Downloads page](https://gnomad.broadinstitute.org/downloads).

### Methods

#### Genome SVs

The new SV dataset for gnomAD v4 was generated using a cloud-based SV joint calling pipeline, GATK-SV ([Collins _et al_. 2020](https://pubmed.ncbi.nlm.nih.gov/32461652/)). To learn more about this method, including the types of variants identified, functional impact, and browser details, please read our v4 genomes SV [blog post](https://gnomad.broadinstitute.org/news/2023-11-v4-structural-variants).

#### Rare Exome CNVs

To generate this reference resource we applied the methods, GATK-gCNV, from our recent publication ([Babadi _et al_. Nat Genet, 2023](https://pubmed.ncbi.nlm.nih.gov/37604963/)). To learn more about this method, including benchmarking, annotations, and browser details, please read our v4 rare exome CNV [blog post](https://gnomad.broadinstitute.org/news/2023-11-v4-copy-number-variants).

### References

For more information, please refer to:

#### Genome SVs:

- [gnomAD SV paper](https://pubmed.ncbi.nlm.nih.gov/32461652/)
- [v4 genomes SV blog post](https://gnomad.broadinstitute.org/news/2023-11-v4-structural-variants)

#### Rare Exome CNVs:

- [Rare exome CNV paper](https://pubmed.ncbi.nlm.nih.gov/37604963/)
- [v4 rare exome CNV blog post](https://gnomad.broadinstitute.org/news/2023-11-v4-copy-number-variants)

<br /><br />

<details>

<summary>Expand to see details for past versions</summary>

### Description of gnomAD v2 SV data

In the gnomAD browser, we provide site, frequency, and annotation information for 445,857 SVs discovered in 10,738 unrelated individuals. As with the gnomAD short variant data set, we have removed individuals known to be affected by severe pediatric disease, as well as their first-degree relatives.

We have also produced VCF and BED files containing the 445,857 SVs from 10,738 unrelated genomes, which are available via [the gnomAD Downloads page](https://gnomad.broadinstitute.org/downloads).

### v2 SV Methods

We catalogued SVs from Illumina short-read whole-genome sequencing (WGS) aggregated across various population genetic and complex disease association studies. In total, this cohort included 14,891 individuals, a subset (72%; 10,738/14,891) of which are included in the public SV dataset release on this website. We performed SV discovery by integrating four published SV algorithms ([Manta](https://www.ncbi.nlm.nih.gov/pubmed/26647377), [DELLY](https://www.ncbi.nlm.nih.gov/pubmed/22962449), [MELT](https://www.ncbi.nlm.nih.gov/pubmed/28855259), and [cn.MOPS](https://www.ncbi.nlm.nih.gov/pubmed/22302147)) to detect sites of putative SV across seven mutational classes, and jointly filtered, genotyped, resolved, and annotated these SVs across all 14,891 genomes. All SV discovery was performed in [FireCloud](https://software.broadinstitute.org/firecloud/), where the components of the gnomAD SV discovery pipeline are available as public methods with dedicated Docker images. Extensive technical details of this process are provided in the supplementary information of the [gnomAD SV paper](https://broad.io/gnomad_sv).

### References

For more information, please refer to the [gnomAD SV paper](https://broad.io/gnomad_sv) or this [blog post](https://gnomad.broadinstitute.org/news/2019-03-structural-variants-in-gnomad/).

</details>

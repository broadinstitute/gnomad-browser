---
index: gnomad_help  
title: 'Overview of structural variants in gnomAD'  
---

# Structural variants in gnomAD

### Background  

Structural variants (SVs) are a form of genomic variation involving the rearrangement of at least 50 nucleotides.  

SVs occur across numerous mutational classes, including rearrangements that result in gains and losses of genomic DNA (known as `unbalanced` SVs, or `copy number variants`/`CNVs`), and dosage-neutral rearrangements of the linear genome sequence (known as `balanced` SVs).  

Due to their size and mutational diversity, SVs can often result in predicted alterations to coding sequences.

### Description of gnomAD SV data

In the gnomAD browser, we provide site, frequency, and annotation information for 445,857 SVs discovered in 10,738 unrelated individuals. As with the gnomAD short variant data set, we have removed individuals known to be affected by severe pediatric disease, as well as their first-degree relatives.  

We have also produced VCF and BED files containing the 445,857 SVs from 10,738 unrelated genomes, which are available via [the gnomAD Downloads page](https://gnomad.broadinstitute.org/downloads).

### Methods

We catalogued SVs from Illumina short-read whole-genome sequencing (WGS) aggregated across various population genetic and complex disease association studies. In total, this cohort included 14,891 individuals, a subset (72%; 10,738/14,891) of which are included in the public SV dataset release on this website. We performed SV discovery by integrating four published SV algorithms ([Manta](https://www.ncbi.nlm.nih.gov/pubmed/26647377), [DELLY](https://www.ncbi.nlm.nih.gov/pubmed/22962449), [MELT](https://www.ncbi.nlm.nih.gov/pubmed/28855259), and [cn.MOPS](https://www.ncbi.nlm.nih.gov/pubmed/22302147)) to detect sites of putative SV across seven mutational classes, and jointly filtered, genotyped, resolved, and annotated these SVs across all 14,891 genomes. All SV discovery was performed in [FireCloud](https://software.broadinstitute.org/firecloud/), where the components of the gnomAD SV discovery pipeline are available as public methods with dedicated Docker images. Extensive technical details of this process are provided in the supplementary information of the [gnomAD SV preprint](https://broad.io/gnomad_sv).

### References

For more information, please refer to the [gnomAD SV preprint](https://broad.io/gnomad_sv) or this [blog post](https://macarthurlab.org/2019/03/20/structural-variants-in-gnomad/).

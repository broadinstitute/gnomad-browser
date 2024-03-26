---
question: 'How was coverage calculated?'
---

#### gnomAD v4.1

gnomAD v4.1 uses the same coverage data as gnomAD v4.0.

For gnomAD v4.0, coverage was computed using all 730,947 gnomAD v4.0 samples from their gVCFs.

The exome gVCFs were produced using a two schemes:

- 4-bin blocking scheme:
  - Reference genotype quality < Q20
  - Reference genotype quality >= Q20 and < Q30
  - Reference genotype quality >=30 and < Q40
  - Reference genotype quality >= Q40
- 7-bin blocking scheme:
  - Reference genotype quality < Q10
  - Reference genotype quality >= Q10 and < Q20
  - Reference genotype quality >=20 and < Q30
  - Reference genotype quality >=30 and < Q40
  - Reference genotype quality >=40 and < Q50
  - Reference genotype quality >=50 and < Q60
  - Reference genotype quality >= Q60

The genome gVCFs were produced using a 3-bin blocking scheme:

- No coverage
- Reference genotype quality < Q20
- Reference genotype quality >= Q20

Coverage was computed for all callable bases in the exome and genome, respectively (all non-N bases, minus telomeres and centromeres). The coverage was binned by quality per data type using the thresholds above, and the median coverage value for each of the resulting coverage blocks was used to compute the coverage metrics presented in the browser.

Because we calculated coverage from sample gVCFs rather than raw read files, we have updated our coverage track to display the **fraction of samples with >20X coverage**. Coverage information from gVCFs is not as granular as coverage information from read data due to the reference block structure within [gVCF](https://gatk.broadinstitute.org/hc/en-us/articles/360035531812-GVCF-Genomic-Variant-Call-Format)s, which means that the absolute values are not as informative as the proportion of samples covered above a certain depth threshold.

<br/><br/>

<details>

<summary>Expand to see details for past versions</summary>

#### gnomAD v3.0

Coverage was computed using all 71,702 gnomAD v3.0 samples from their GVCFs . The gVCFs were produced using a 3-bin blocking scheme:

- No coverage
- Reference genotype quality < Q20
- Reference genotype quality >= Q20

The coverage was binned by quality using the thresholds above and the median coverage value for each of the resulting coverage blocks was used to compute the coverage metrics presented in the browser.

Coverage was computed for all callable bases in the genome (all non-N bases, minus telomeres and centromeres).

#### gnomAD v2

Coverage was calculated separately for exomes and genomes on a ~10% subset of the samples using the [samtools](https://www.htslib.org/) depth tool. The base quality threshold was set to 10 for the -q option and the mapping quality threshold set to 20 for the -Q option. It is calculated per base of the respective calling intervals, includes sites with zero depth (-a flag), and is capped at 100x for a given sample and base pair. Mean coverage is then plotted on the browser. The numbers in columns over_1, over_5, over_10, etc of our downloadable coverage files refer to the fraction of samples with a depth of coverage of at least 1 read, 5 reads, 10 reads, etc. for the given chromosome and position.

</details>

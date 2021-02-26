---
question: 'How was coverage calculated?'
---

#### gnomAD v3.0

Coverage was computed using all 71,702 gnomAD v3.0 samples from their GVCFs . The gVCFs were produced using a 3-bin blocking scheme:

- No coverage
- Reference genotype quality < Q20
- Reference genotype quality >= Q20

The coverage was binned by quality using the thresholds above and the median coverage value for each of the resulting coverage blocks was used to compute the coverage metrics presented in the browser.

Coverage was computed for all callable bases in the genome (all non-N bases, minus telomeres and centromeres).

#### gnomAD v2

Coverage was calculated separately for exomes and genomes on a ~10% subset of the samples using the [samtools](https://www.htslib.org/) depth tool. The base quality threshold was set to 10 for the -q option and the mapping quality threshold set to 20 for the -Q option. It is calculated per base of the respective calling intervals, includes sites with zero depth (-a flag), and is capped at 100x for a given sample and base pair. Mean coverage is then plotted on the browser. The numbers in columns over_1, over_5, over_10, etc of our downloadable coverage files refer to the fraction of samples with a depth of coverage of at least 1 read, 5 reads, 10 reads, etc. for the given chromosome and position.

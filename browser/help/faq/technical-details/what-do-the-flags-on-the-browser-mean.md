---
question: 'What do the flags on the browser mean?'
---

Flags that will appear on variant pages:

- AC0: The allele count is zero after filtering out low-confidence genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls)
- AS-VQSR: Failed GATK Allele-Specific Variant Quality Recalibration (AS-VQSR)
  InbreedingCoeff: The Inbreeding Coefficient is < -0.3
- RF (gnomAD v2 only): Failed random forest filtering thresholds of 0.055 for exome SNVs, 0.206 for exome indels, 0.263 for genome SNVs, and 0.222 for genome indels
- Not in exomes: Variant was not called in the gnomAD exomes, i.e. no gnomAD exome sample had a reference or non-reference genotype call. Any loci outside of the [exome capture regions](https://gnomad.broadinstitute.org/help/exome-capture-tech) will have this flag.
- Not in genomes: Variant was not called in the gnomAD genomes, i.e., no gnomAD genome sample had a reference or non-reference genotype call.
- No data: Variant was not called in the specified data type, i.e., no samples in that data type had a reference or non-reference genotype call. Flag will always exist in combination with either "Not in exomes" or "Not in genomes" flag. For more information, see our allele count zero [help page](https://gnomad.broadinstitute.org/help/allele-count-zero).
- Discrepant Frequencies: Variant has highly discordant frequencies in the gnomAD exomes and genomes. Variants are flagged using a Cochran–Mantel–Haenszel (CMH) test. For more information, see our combined frequency [help page](https://gnomad.broadinstitute.org/help/combined-freq-stats).

Flags that will appear in the variant table on gene/region pages:

- CHIP: Analysis of allele balance and age data indicates that this gene shows evidence of clonal hematopoiesis of indeterminate potential ([CHIP](https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-020-2308-7/MediaObjects/41586_2020_2308_MOESM1_ESM.pdf))
- Monoallelic: All samples are homozygous alternate for the variant
  Only heterozygous: All samples are heterozygous for the variant
- MNV: Multinucleotide variant: the variant is found in phase with another variant, altering its functional interpretation
- LCR: Found in a low complexity region: these regions were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) at a score threshold of 30 and provided by Heng Li
- LC pLoF: Low-confidence pLoF, variant determined by [LOFTEE](https://github.com/konradjk/loftee) to be likely not LoF for the transcript
- pLoF Flag: Flagged by [LOFTEE](https://github.com/konradjk/loftee), a warning provided by LOFTEE to use caution when interpreting the transcript or variant
- NC Transcript: Marked in a putative LoF category by VEP (essential splice, stop-gained, or frameshift) but appears on a non-protein-coding transcript
- SEGDUP: Found in a region overlapping a segmental duplication (regions provided by GA4GH Benchmarking Team)
- Common low heteroplasmy: Variant is present at an overall frequency of .001 across all samples with a heteroplasmy level > 0 and < 0.50 (mitochondrial variants only)

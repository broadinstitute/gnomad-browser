---
question: 'What do the flags on the browser mean?'
---

Flags that will appear on variant pages:

- AC0: The allele count is zero after filtering out low-confidence genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls)

- AS-VQSR (gnomAD v3 only): Failed GATK Allele-Specific Variant Quality Recalibration (AS-VQSR)

- InbreedingCoeff: The Inbreeding Coefficient is < -0.3

- RF (gnomAD v2 only): Failed random forest filtering thresholds of 0.055 for exome SNVs, 0.206 for exome indels, 0.263 for genome SNVs, and 0.222 for genome indels

Flags that will appear in the variant table on gene/region pages:

- MNV: Multinucleotide variant: the variant is found in phase with another variant, altering its functional interpretation

- LCR: Found in a low complexity region: these regions were identified with the [symmetric DUST algorithm](https://www.ncbi.nlm.nih.gov/pubmed/16796549) at a score threshold of 30 and provided by Heng Li

- LC pLoF: Low-confidence pLoF, variant determined by [LOFTEE](https://github.com/konradjk/loftee) to be likely not LoF for the transcript

- pLoF Flag: Flagged by [LOFTEE](https://github.com/konradjk/loftee), a warning provided by LOFTEE to use caution when interpreting the transcript or variant

- NC Transcript: Marked in a putative LoF category by VEP (essential splice, stop-gained, or frameshift) but appears on a non-protein-coding transcript

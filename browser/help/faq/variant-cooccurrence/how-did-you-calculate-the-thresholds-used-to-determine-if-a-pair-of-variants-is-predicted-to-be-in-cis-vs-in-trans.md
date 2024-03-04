---
question: 'How did you calculate the thresholds used to determine if a pair of variants is predicted to be in cis vs in trans?'
---

For each pair of variants, we generated pairwise genotype counts using the gnomAD v2.1 data and then applied an [Expectation-Maximization (EM) algorithm](https://pubmed.ncbi.nlm.nih.gov/7476138/) to estimate the haplotype frequencies. These haplotype frequencies were then used to determine the probability of the two variants being in _trans_ (on different haplotypes; P<sub>trans</sub>), which was defined as the probability of inheriting each of the haplotypes that contain only one of the two variant alleles.

Using 4,775 trios that were jointly processed with gnomAD, we identified 339,857 unique variant pairs and determined their phase using parental transmission (phasing-by-transmission). We calculated P<sub>trans</sub> values for all variant pairs found in the trios using gnomAD samples from the same genetic ancestry group. We binned variant pairs based on their P<sub>trans</sub> values and calculated the proportion of trio variant pairs that were in _cis_ or in _trans_. We defined P<sub>trans</sub> threshold for being in cis (or trans) based on the maximum Ptrans value at which ≥90% of the variant pairs in that bin were in _cis_ (or _trans_) based on the gold standard phasing-by-transmission data. This resulted in P<sub>trans</sub> values of ≤ 0.02 and ≥ 0.55 as the threshold for variants in _cis_ and _trans_, respectively.

For more information, see our [publication](https://www.nature.com/articles/s41588-023-01608-3).

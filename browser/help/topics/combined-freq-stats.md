---
id: combined-freq-stats
title: 'Combined genomes and exomes frequency statistics'
---

### <a id="contingency_table_test"></a> Contingency Table Test (Chi-squared or Fisher's exact test)

We applied Hail's [contingency_table_test](https://hail.is/docs/0.2/functions/stats.html#hail.expr.functions.contingency_table_test) to a 2x2 table representing allele counts (AC) and allele numbers (AN) for both exomes and genomes. The minimum cell count in the contingency table defines whether a chi-squared or Fisher's exact test is used. We used a threshold of `min_cell_count=100`, meaning that if all cell counts in the 2x2 table were over 100, we used a Fisher's exact test. We generated odds ratio and p-values for all variants in both the gnomAD exomes and genomes.

### <a id="cmh_test"></a> Cochran–Mantel–Haenszel (CMH) Test

This stratified [test](https://en.wikipedia.org/wiki/Cochran%E2%80%93Mantel%E2%80%93Haenszel_statistics) of independence is applied to 2x2xK contingency tables, where K represents the number of strata (in this case, inferred genetic ancestry groups). The CMH test provides a way to assess variant frequency differences between exomes and genomes while controlling for population structure, offering a more nuanced understanding of the discrepancies observed. The CMH test is computed using Hail's [cochran_mantel_haenszel_test](https://hail.is/docs/0.2/functions/stats.html#hail.expr.functions.cochran_mantel_haenszel_test), which outputs a chi-squared test statistic and corresponding p-value.

### Variant Warnings Based on Contingency Table and CMH Test Results

In gnomAD v4.1, we add a warning to variants exhibiting highly discordant frequencies between the exomes and genomes. For variants observed in a single inferred genetic ancestry group, we use the [contingency table test](/help/combined-freq-stats#contingency_table_test) on allele counts in that genetic ancestry group. Otherwise, in cases where the variant is present in multiple genetic ancestry groups, we use the [CMH test](/help/combined-freq-stats#cmh_test), to compare variant frequencies while accounting for differences driven by inferred genetic ancestry group structure in the datasets. By leveraging these test statistics, we've pinpointed variants where the contingency table test or CMH p-value is less than 10<sup>-4</sup> and have flagged these variants for users' attention. About 2.5% (2,230,151 out of 91,177,483) exhibit statistically different frequencies between the two data types at this threshold.

Example [variant](https://gnomad.broadinstitute.org/variant/1-55052214-G-T?dataset=gnomad_r4) flagged based on contingency table test:
![variant flagged with contingency table test](variant-ctt-flag.png)
![variant flagged with contingency table test showing hover over text](variant-ctt-hover.png)

Example [variant](https://gnomad.broadinstitute.org/variant/1-55039847-G-A?dataset=gnomad_r4) flagged based on CMH test:
![variant flagged with CMH test](variant-cmh-flag.png)
![variant flagged with CMH test showing hover over text](variant-cmh-hover.png)

The expected number of variants to reach this threshold by chance is 9,100 (out of 91 million total variants shared between the exomes and genomes). Observing approximately 245 times more variants than expected highlights the robustness of our approach. The p-value distribution further supports the validity of our warnings, showing minimal baseline inflation and underscoring the significance of flagged variants.

![CMH p-value distribution](cmh-pval.png)

### Why have we added these statistical tests

For the first time, in gnomAD v4.0, we released a combined filtering allele frequency (FAF), integrating variant frequencies across the 734,947 exomes and 76,215 genomes. This integration brings the advantage of a larger, more diverse sample set but also introduces challenges. These challenges stem from differences in sequencing and processing methodologies, as well as variations in sample composition due to ascertainment biases. Addressing these challenges is crucial for providing accurate and reliable genetic insights.

These enhancements and warnings are part of our ongoing commitment to data integrity and usability in gnomAD. By identifying variants with significant frequency discrepancies and providing contextual warnings, we aim to equip researchers with the knowledge needed to make informed decisions in their genetic analyses. We encourage users to explore these new statistical analyses as they navigate gnomAD v4.1.

For more information about this flag and how to approach interpreting frequencies at the flagged loci, please see our [blog post](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1/#joint-combined-exome--genome-frequencies).

### Discrepant frequency MVP
Note that the statistical tests and associated discrepant frequency flag added in gnomAD v4.1 are a minimum viable product (MVP) version. We encourage feedback on this flag and note that users should exercise caution when using these results for interpretation, as they are preliminary and subject to revisions in future updates.

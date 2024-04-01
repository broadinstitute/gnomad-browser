---
id: faf
title: 'Filtering allele frequency'
---

This annotation can be used for filtering variants by allele frequency against a disease-specific threshold that can be set for each disease (e.g. BA1 in the 2015 ACMG/AMP guidelines). In this case the filtering allele frequency (FAF) is the maximum credible genetic ancestry group AF (e.g. the lower bound of the 95% confidence interval (CI)). If the FAF is above the disease-specific threshold, then the observed AC is not compatible with pathogenicity. See http://cardiodb.org/allelefrequencyapp/ and [Whiffin _et al._ 2017](https://www.nature.com/articles/gim201726) for additional information.

Note that the GroupMax FAF contains filtering allele frequency information from the genetic ancestry group with the highest **FAF**, not the filtering allele frequency information calculated on the genetic ancestry group with the highest **AF**.

The filtering allele frequency calculation only includes non-bottlenecked genetic ancestry groups: we did not calculate this metric on the Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (`mid`), and "Remaining Individuals" (`rmi`) groups.

On the browser, the **GroupMax FAF** annotation is directly available on the variant page. In the VCF and Hail Tables, the filtering allele frequency annotation (abbreviated "`faf`") is computed globally and for each genetic ancestry group. Filtering allele frequencies (FAFs) for each genetic ancestry group are listed separately with 95% and 99% CIs.
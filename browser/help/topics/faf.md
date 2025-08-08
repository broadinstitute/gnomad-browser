---
id: faf
title: 'Filtering allele frequency'
---

This annotation can be used for filtering variants by allele frequency against a disease-specific threshold that can be set for each disease (e.g. BA1 in the 2015 ACMG/AMP guidelines). In this case the filtering allele frequency (FAF) is the maximum credible genetic ancestry group AF (e.g. the lower bound of the 95% confidence interval (CI)). If the FAF is above the disease-specific threshold, then the observed AC is not compatible with pathogenicity. See http://cardiodb.org/allelefrequencyapp/ and [Whiffin _et al._ 2017](https://www.nature.com/articles/gim201726) for additional information.

Note that the GroupMax FAF contains filtering allele frequency information from the genetic ancestry group (excluding the Unassigned group) with the highest **FAF**, not the filtering allele frequency information calculated on the genetic ancestry group with the highest **AF**.

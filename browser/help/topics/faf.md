---
id: faf
title: 'Filtering allele frequency'
---

This annotation can be used for filtering variants by allele frequency against a disease-specific threshold that can be set for each disease (e.g. BA1 in the 2015 ACMG/AMP guidelines). In this case the filtering allele frequency (FAF) is the maximum credible genetic ancestry group AF (e.g. the lower bound of the 95% confidence interval (CI)). If the FAF is above the disease-specific threshold, then the observed AC is not compatible with pathogenicity. See http://cardiodb.org/allelefrequencyapp/ and [Whiffin _et al._ 2017](https://www.nature.com/articles/gim201726) for additional information.

This calculation only includes non-bottlenecked genetic ancestry groups: we did not calculate this metric on the Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (`mid`), and "Remaining Individuals (`rmi`) groups.

On the browser, this annotation is directly available on the variant page. In the VCF and Hail Tables, this annotation is computed globally and for each genetic ancestry group. Genetic ancestry group specific AFs are listed separately with 95% and 99% CIs.

### <a name="grpmax"></a>Group maximum allele frequency

This annotation (abbreviated "`grpmax`") contains allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry groups with the highest frequency.

For gnomAD v4, this excludes Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (mid), and "Remaining Individuals" (`rmi`) groups. For gnomAD v2, this excludes Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining Individuals" (`rmi`) groups.

---
id: grpmax
title: 'Group maximum allele frequency'
---

This annotation (abbreviated "`grpmax`") contains allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry groups with the highest **AF**. Note that `grpmax` is distinct from filtering allele frequency.

For gnomAD v4 exomes and genomes, this calculation excludes Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining Individuals" (`rmi`) groups. Due to small group size, we also did not include the Middle Eastern (`mid`) group in genome `grpmax` calculations. For gnomAD v2, this calculation excludes Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining Individuals" (`rmi`) groups.

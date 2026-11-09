---
id: filtering-gnomad-and-clinvar-to-matching-variants
title: Filtering gnomAD and ClinVar tracks to the same set of variants
---

Check this box to show the same shared set of variants in both the gnomAD and ClinVar variant tracks.

Toggling filters in either section will then affect the shared set of variants displayed. For example, selecting:

- "Exomes" and "pLoF only" in gnomAD.
- "Pathogenic / likely pathogenic" and "Uncertain significance / conflicting" in ClinVar.

Will result in both tracks showing only variants that are those classifications in ClinVar, and are pLoF variants in gnomAD exomes. Note that the gnomAD variant display filters out variants that failed quality control, unless "Filtered variants" is checked.

Uncheck this box to have each section filter independently based on the selected criteria.

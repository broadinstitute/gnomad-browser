---
id: filtering-gnomad-and-clinvar-to-matching-variants
title: Filtering gnomAD and ClinVar tracks to the same set of variants
---

Check this box to show the same shared set of variants in both tracks. Matching uses the exact variant ID in the selected gnomAD dataset and this ClinVar release, not precomputed gnomAD membership.

Apply filters in either section to restrict the shared set. For example, select:

- "Pathogenic / likely pathogenic" and "Uncertain significance / conflicting" in ClinVar.
- "Exomes" and "pLoF only" in gnomAD.

Both tracks will then show only variants present in both datasets that pass the selected ClinVar classifications and are pLoF variants in gnomAD exomes. Consequence annotations can differ between the datasets; each section uses its own annotations.

Uncheck "Display neighboring variants" to make table search restrict the shared set. Otherwise, search highlights and navigates within the shared set without changing membership.

Uncheck synchronization to apply each section's filters only to its own track without changing the existing filter choices.

If ClinVar data is unavailable, synchronization is disabled. Switch datasets or navigate to a different gene, transcript, or region to reset page-local filter choices.

---
question: 'Why is a pair of variants missing from the downloadable table?'
---

We calculated inferred phasing data for all pairs of variants within a gene where both variants have a global allele frequency in gnomAD v2.1.1 exomes <5% and are either coding, flanking intronic (from position -1 to -3 in acceptor sites, and +1 to +8 in donor sites), or in the 5’/3’ UTRs.

In the downloadable file, we provide inferred phasing data for 20,921,100 pairs of variants that were seen at least once in the same individual in gnomAD. Therefore, if a pair of qualifying variants cannot be found in this file, it means they were never seen in the same individual and the phase is predicted to be trans.

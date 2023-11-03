---
question: 'How was the expected number of variants determined?'
---

We used a mutational model that accounts for local sequence context, CpG methylation, and sequencing depth to predict the number of expected single nucleotide variants per functional class per gene. More details can be found in the help section on [gene constraint](/help/constraint) and in [Karczewski _et al._ Nature 2020](https://doi.org/10.1038/s41586-020-2308-7). Note that the expected variant counts for bases with a median depth <1 were removed from the totals. In v4, we applied our mutational model only to sites with a median depth in the exomes ≥30.

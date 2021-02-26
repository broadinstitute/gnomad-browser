---
question: 'Why are constraint metrics missing for this gene or annotated with a note?'
---

Genes that were outliers in certain assessments will not have constraint metrics or will be flagged with a note warning of various error modes. Please note that these assessments were applied to the canonical transcripts of the genes. If a gene was not annotated as a protein-coding gene in GENCODE v19, we did not calculate constraint. The following list describes the reason names given in the constraint_flag column of the [constraint files](/downloads#v2-constraint):

- no_variants: Zero observed synonymous, missense, pLoF variants
- no_exp_lof: Zero expected pLoF variants
- lof_too_many: More pLoF variants than expected
- no_exp_mis: Zero expected missense variants
- mis_too_many: More missense variants than expected
- no_exp_syn: Zero expected synonymous variants
- syn_outlier: More or fewer synonymous variants than expected


Possible reasons that one might observe the deviations listed above include mismapped reads due to homologous regions or poor quality sequencing data.

---
id: include-filtered-mitochondrial-variants
title: 'Include filtered variants'
---

Selection this option will include variants that did not pass our quality control process.

If filtered variants are included, the data source icons in the variant table will be distinguished with reduced opacity and a dotted border to indicate lower reliability.

Be careful when including filtered variants: some poor quality variants (and summary statistics) will be added to the table. This feature should be used with caution.

### Filters

- Artifact-prone site: variant overlaps site that is commonly reported in literature to be artifact-prone
- Indel stack: allele where all samples with the variant call had at least 2 different indels called at the position
- No passing genotype: no individuals were PASS for the variant

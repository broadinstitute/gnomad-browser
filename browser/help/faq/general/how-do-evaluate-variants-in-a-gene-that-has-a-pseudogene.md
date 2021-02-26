---
question: 'How do I evaluate variants in a gene that has a pseudogene? Were any steps taken to distinguish the gene from the pseudogene?'
---

Short read sequencing can produce mapping issues when a gene has a highly homologous pseudogene. Many variants in such genes (e.g. [PRSS1](/gene/ENSG00000204983)) will be filtered due to low mapping quality or deviation from Hardy-Weinberg equilibrium; the remaining variants should be interpreted with caution. The gnomAD pipeline does not apply any special filters to regions with a highly similar pseudogene.

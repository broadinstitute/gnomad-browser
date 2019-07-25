---
index: gnomad_help  
title: 'SV consequence: intragenic exonic duplication'
---

## ![](https://placehold.it/15/7459B2/000000?text=+) Intragenic exonic duplication (IED)

### Description

SV resulting in IED of a gene are predicted to entirely duplicate at least one protein-coding exon within the boundaries of the canonical transcript.  

These variants appear to correlate well with constraint against damaging SNVs, suggesting that IED SVs can be interpreted as likely damaging on average. However, there will be context-specific situations where this is not the case. 

For more details, please refer to [the gnomAD SV preprint](https://broad.io/gnomad_sv).  

### Disclaimer

Given the expected context specificity of IEDs, it is likely that not all IED SVs will result in damaging or functional alterations to any given gene. 

Just like for SNVs & indels, please [carefully inspect each IED SV before interpretation](https://broad.io/gnomad_drugs), particularly in the context of [which exons the SV overlaps, and on which transcripts](https://broad.io/tx_annotation).

### Annotation criteria

An SV was assigned an `intragenic exonic duplication` consequence if it met any of the following criteria:

![Predicted loss-of-function (pLoF)](gnomAD_browser.effect_schematics_IED.png)    

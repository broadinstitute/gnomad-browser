---
index: gnomad_help  
title: 'SV consequence: copy gain'
---

## ![](https://placehold.it/15/2376B2/000000?text=+) Copy gain (CG)

### Description

SV resulting in CG of a gene are predicted to entirely duplicate a gene's canonical transcript.  

These variants can be expected to result in increased gene copy number. However, further study is required before predicting the functional consequences of CG events, which are likely to be gene specific.  

For more details, please refer to [the gnomAD SV preprint](https://broad.io/gnomad_sv).  

### Disclaimer

Given the context specificity of gene expression and cis-regulation, it uncertain that all CG SVs will result in increased expression of their duplicated genes. 

Just like for SNVs & indels, please [carefully inspect each CG SV before interpretation](https://broad.io/gnomad_drugs), particularly in the context of [which exons and transcripts the SV overlaps](https://broad.io/tx_annotation).

### Annotation criteria

An SV was assigned a `copy gain` consequence if it met any of the following criteria:

![Predicted loss-of-function (pLoF)](gnomAD_browser.effect_schematics_CG.png)    

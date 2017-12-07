---
index: gnomad_help
title: 'Annotations in gnomAD'
---

#  Annotations

Variants in the browser (and all current VCFs available for download) were annotated using VEP version 85 using Gencode v19 on GRCh37, with the [LOFTEE](https://github.com/konradjk/loftee) (Loss-Of-Function Transcript Effect Estimator) plugin.

LOFTEE considers all stop-gained, splice-disrupting, and frameshift variants, and filters out many known false-positive modes, such as variants near the end of transcripts and in non-canonical splice sites, as described in the [code documentation](https://github.com/konradjk/loftee). These variants are flagged on the gene page with "LC LoF" and on the variant page in the Annotations section: however, as these annotations are transcript specific, you may need to click on the "Transcripts" box in order to observe the annotation for each particular transcript.

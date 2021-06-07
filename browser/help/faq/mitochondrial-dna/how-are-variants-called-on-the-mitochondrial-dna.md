---
question: 'How are variants called on the mitochondrial DNA (mtDNA)?'
---

Mitochondrial DNA variants are called using a specialized GATK pipeline that addresses challenges specific to the mtDNA. Homoplasmic and heteroplasmic variants are called using the GATK MuTect2 variant caller in a special "mitochondrial mode", with extensive filtering of samples and variants as described in our ["gnomAD v3.1 Mitochondrial DNA Variants" blog post](https://gnomad.broadinstitute.org/news/2020-11-gnomad-v3-1-mitochondrial-dna-variants/).

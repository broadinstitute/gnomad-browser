---
index: gnomad_help
title: 'Browser/VCF multiallelic site disagreements'
---

# Why does the browser seem to disagree with the gnomAD VCF at this multiallelic site?

Due to the limitations of the VCF format, multi-allelic variants are put together on one VCF line. This inevitably adds complexity to otherwise simple variants, and thus when parsing onto the browser, we apply a [minimal representation](http://www.cureffi.org/2014/04/24/converting-genetic-variants-to-their-minimal-representation/) script. For instance, a variant whose REF is GC and ALT alleles are TC,G - the first ALT allele is actually a SNP and will be represented in the browser as G->T.

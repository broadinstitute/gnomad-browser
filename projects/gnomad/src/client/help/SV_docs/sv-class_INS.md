---
index: gnomad_help  
title: 'SV class: insertion'  
---

## ![](https://placehold.it/15/D474E0/000000?text=+) Insertions (INS)  

Classification: _Balanced<sup>*</sup> canonical SV_

![Insertion (INS)](gnomAD_browser.SV_schematics_INS.png)  

Insertions are SVs that involve at least 50bp of sequence being added to a specific genomic locus. This class includes multiple families of insertions, including mobile element insertions (e.g., see [Stewart et al., 2011](https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1002236)) and indels at least 50bp in size.  

In gnomAD, insertion coordinates represent the insertion site, not the origin of the insertion source. The source of the inserted sequence, if known, is included in the VCF under the `SOURCE` INFO field. For mobile elements, the family of mobile element (e.g., SINE, LINE, etc.) is specified in the alternate allele field of the VCF. 

\* Note: insertions in gnomAD are assumed to be copy number-neutral (other than mobile elements acting via [retroduplicative mechanisms](https://www.ncbi.nlm.nih.gov/pubmed/24026178)), or are too small to be confirmed as such based on read depth evidence. It is possible that small insertions may in fact be small tandem duplications below the resolution of read depth evidence. Non-mobile-element insertions for which a clear duplication of the inserted sequence is evident from read depth evidence are classified as complex SVs (subclass `dDUP`).


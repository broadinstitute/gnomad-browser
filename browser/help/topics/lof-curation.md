---
id: lof-curation
title: Loss-of-Function Curation
---

The Loss-of-Function (LoF) classification is a result of a specialized and manual curation of predicted loss of function (pLoF) variants that have passed all LOFTEE filters and other QC flags in gnomAD and determines how likely these variants are to result in loss of function. For each curated variant, two curators performed an independent curation, and this is a process that yields a **prediction** for the likelihood of loss of function. Note that these predictions are based on _in silico_ metrics only, and do not incorporate experimental evidence, so should be regarded as more confident than automated curations but still uncertain.

### Classification Categories

pLoF curated variants are assigned one of five classifications based on the presence or absence of certain error modes (described below). These classifications include: LoF, likely LoF, uncertain LoF, likely not LoF, and not LoF. LoF classified variants have no error modes that indicate they may not cause LoF, while not LoF classified variants have some error modes that indicate these variants are predicted to not result in LoF. Similar to ACMG/AMP criteria for likely pathogenic and likely benign classification of variants, likely LoF and likely not LoF classified variants are slightly less confidently predicted to result in LoF or not LoF, respectively. Variants with an uncertain LoF classification are similar to the ACMG/AMP variants of uncertain significance (VUS’s), and do not have sufficient evidence to point towards a classification of LoF or not LoF.

### How is this useful?

For likely LoF and LoF variants, this manual curation provides increased confidence that these variants are truly LoF variants for a gene and should result in nonsense-mediated decay, by systematically excluding a number of common annotation and sequencing error modes. Ultimately, however, functional studies would be needed to fully validate the potential LoF impact of a variant.

For likely not LoF and not LoF variants, this curation supports the conclusion that either these variants are likely the result of a technical sequencing error, or their predicted effect based on our extensive manual curation is not LoF. For those variants with technical errors that are also deemed not LoF, the allele frequency of these variants in gnomAD should not be considered the true frequency of these variants in gnomAD. For other variants that have been curated as likely not LoF and not LoF, these may still be pathogenic variants, but the predicted mechanism for these variants in causing disease is not predicted to be due to LoF. For example, a nonsense variant in the last exon would not be expected to result in nonsense mediated decay but it could still disrupt the function of the protein if the terminal end of the protein was essential for function. In addition, a variant that is located in a homopolymer repeat could be an artifact of sequencing in gnomAD, but if it is identified in an individual with disease (where it was likely Sanger confirmed), then the mechanism is actually likely to be LoF.

Uncertain LoF variants represent cases where we were unable to reach a more conclusive classification and therefore should not be interpreted as falling into either of the above two categories.

### LoF Curation Flags

#### Mapping Issue Flag

There is a potential mapping issue for variants in this region as identified by repeat tracks (Mappability, RepeatMasker, Segmental Dups, Self Chain, and Simple Repeats) in the UCSC genome browser ([Kent et al. 2002](https://pubmed.ncbi.nlm.nih.gov/12045153/)).

#### Genotyping Issue Flag

Quality of variant calls is at the lower end of the allowed “passing” threshold based on allele balance, depth, and genotype quality scores so we have lower confidence that this variant is real (i.e. not a sequencing artifact) and conservatively do not want to assert that it would result in loss of function in the individual in gnomAD. This flag may also indicate a region that is of lower sequence complexity, GC rich, or has evidence of polymerase stuttering.

#### Homopolymer Flag

This flag was used when an indel variant falls within a homopolymer repeat. Homopolymers are defined as a single nucleotide, dinucleotide, or trinucleotide motifs that are repeated in the reference sequence at least 5-7 times (see the homozygous versus heterozygous variant curation section below).

#### No Read Flag

No read data was available for visualization of individuals with this variant in gnomAD. In some cases we could still determine a variant was not LoF, due to likely annotation errors. As this is an important part of the LoF curation process, we flagged these variants. Indels without any read data from homozygotes or heterozygotes were curated as uncertain_LoF if there was no indication of other major errors. In some cases, this flag was only used when there was an absence of reads for individuals with homozygous variants in gnomAD.

#### Reference Error Flag

The variant was called due to an error or rare variant in the human genome reference sequence GRCh37/hg19, and therefore is present at a far higher than expected frequency (>99% MAF) across all gnomAD populations. Additionally, these variants may appear as gaps in the UCSC genome browser or as falling within small artificial intronic sequences of 1-2 bp in length created around reference errors. Most of these have been corrected in GRCh38.

#### Strand Bias Flag

The variant shows evidence of strand imbalance where it is unevenly distributed among forward and reverse strands in each individual's read data in the gnomAD browser. Strand bias in exome data in variants (i.e. not sequencing artifacts) at intron-exon boundaries has been previously described, so this error mode was not flagged in canonical splice site variants ([Guo et al. 2012](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3532123/)).

#### MNV (Multi-nucleotide variants) / Frame-restoring Indel Flag

##### MNV

The variant is observed in cis with another variant in the same codon. When combining both variants, the predicted change is a missense or synonymous variant rather than a termination event, which would have been predicted from one of the pair of variants alone. MNVs are already flagged in gnomAD, but this flag will specifically indicate when the presence of a MNV does not result in LoF ([Wang et al., 2020](https://www.nature.com/articles/s41467-019-12438-5)).

##### Frame-restoring indel

This flag indicated there are two indels that were observed in cis. While at least one of these indels would have resulted in a frameshift and is therefore a pLoF variant, the second indel restores the reading frame, and is thus predicted to result overall in an in-frame indel (potentially with an intervening stretch of out-of-frame sequence) rather than a variant that triggers NMD. This flag may also be used for tandem repeats occurring near splice sites that are predicted to undergo normal splicing and maintain the reading frame.

#### Splice Rescue Flag

_In silico_ splice predictors predict a cryptic in-frame splice site to rescue a canonical splice site abolished by the pLoF variant in question. Alternatively, the presence of a cryptic splice site within 6bp of the abolished canonical splice site can be considered rescued in some cases. These cryptic sites may be either up or downstream of the canonical splice site (see homozygous versus heterozygous curations).

#### Splice Variant at In-frame Exon Flag

The variant is a splice disrupting variant that is adjacent to an in-frame exon and therefore not expected to result in NMD.

#### Weak/Unrecognized Splice Rescue Flag

_In silico_ splice predictors predict a weak rescue of a canonical splice site variant by a cryptic in-frame splice site up or downstream of the canonical splice site, or the cryptic splice sites are unrecognized by splicing predictors. “Weak” rescue by _in silico_ splice predictors is defined as a prediction that differs by <50% from the prediction scores at the canonical splice site.

#### Minority of Transcripts Flag

Variants are annotated as LoF in less than or equal to 50% of protein-coding GENCODE transcripts for the gene ([Harrow et al. 2012](https://pubmed.ncbi.nlm.nih.gov/22955987/)). GENCODE transcripts (rather than Ensembl or RefSeq) transcripts were selected for these curations because this is a refined transcript set built on various types of evidence. Another transcript set could have been used and in cases where there is additional transcript information available, there may be benefit from reinterpreting variants in terms of the disease or biologically relevant transcript(s).

#### Weak Exon Conservation Flag

Variant falls within an exon that is **more weakly conserved relative to the entire gene** for all vertebrates in UCSC genome browser. Conservation is visually assessed in the UCSC genome browser using PhyloP ([Pollard et al. 2010](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2798823/)).

#### Partial Exon Conservation Flag

The variant falls within an exon that is **partially**, but not fully, conserved relative to the entire gene for all vertebrates in UCSC genome browser. Conservation is visually assessed in the UCSC genome browser using PhyloP.

#### Weak Gene Conservation Flag

The variant falls within a gene where the entire gene is weakly conserved as visually assessed in the UCSC genome browser using PhyloP.

#### Last Exon Flag

The variant results in a termination event that falls within the last coding exon of the gene or within the last 50bp of the penultimate exon, and occurs at a position of the gene that does not remove more than 25% of the gene’s coding sequence.

#### Other Transcript Error Flag

This flag could refer to several possible error modes, all related to situations where we believe that the affected transcripts are either artifacts, or are unlikely to be biologically critical:

- The variant falls within an “extension” of the exon in a transcript in which the majority of transcripts for the gene do not have the same extended portion. This region is also poorly conserved across vertebrates in the UCSC genome browser and has a lower mean pext score relative to the mean pext for the gene.
- The variant is in a gene where there are multiple (at least 2) transcripts that exist in different frames (overprinting), and the variant is annotated as LoF in at least one of those transcripts.
- The variant is nonsense and falls within the first coding exon for the gene, for which there is a downstream methionine, also in the first exon, that is well conserved across vertebrates and could rescue initiation of translation for this transcript.
- The variant falls in a codon that is split between 2 exons, and one of these exons is in a minority of transcripts. In this case, this variant is a nonsense variant in the exon that is in a minority of transcripts, but is synonymous or missense in the other transcripts.

#### Low Relative Mean Pext / Pext Does not Support Splicing Flag

The pext score is a metric that captures the expression of all transcripts overlapping the affected base across a variety of adult human tissues, calculated from the GTEx dataset ([Cummings et al. 2020](https://www.nature.com/articles/s41586-020-2329-2)). This flag means that the variant in question has a lower mean pext relative to the mean pext of the entire gene, typically meaning that the exon affected by the variant is weakly expressed compared to other exons in the gene. Alternatively, there is a splicing variant in an exon where pext does not support splicing of that exon to occur at that position. For example, a gene may have two transcripts with overlapping exons of different lengths, such that a splice variant in the shorter version of the exon would fall in the coding region of the longer version of the exon. A high pext (indicating expression) for the longer exon would lend more support to the longer exon being the more biologically relevant version. Thus, the splice variant in the shorter transcript would not be as strongly supported.

As mean pext across all tissues was used for curation, alternative interpretations may be supported for variants in genes that are known to exhibit highly tissue-specific expression.

#### Coverage Issue Flag

The variant falls within a region of the gene where the per-base mean depth of coverage is very low (generally less than 20X) in both exome and genome data.

#### Uninformative Pext Flag

The variant falls within a gene that has a low mean pext across the entirety of the gene and has weak gene conservation or the variant falls within a minority of transcripts with no other flags that indicate it is not LoF. Alternatively, the variant falls within a gene that is not expressed in GTEx, the gene is too large to assess with pext scores, pext was too difficult to visualize across the gene, or there is a small transcript for the gene that is more highly expressed compared to the canonical transcript for the gene and therefore distorts the pext scores across the gene.

### Homozygous versus Heterozygous Curations

All homozygous pLoF variants in gnomAD were curated as part of the efforts taken in [Karczewski et al. 2020 Nature](https://www.nature.com/articles/s41576-020-0255-7) paper to identify genes that were tolerant of complete knockout in humans, and therefore these curations tended to be more stringent. Therefore, certain error modes are applied differently depending on whether the variant appears in the homozygous versus heterozygous state in gnomAD. For example, in the homozygous state, a homopolymer error is only applied when a motif is repeated seven or more times in the reference sequence. In the heterozygous state, a homopolymer error is applied if a repeat motif is observed five or more times. This difference in interpretation is based on the more unlikely chance that an artifact would be seen in the homozygous state versus a heterozygous state. In both cases, the error would result in a likely not LoF verdict. Besides technical error differences, essential splice rescues were evaluated more strictly for homozygous individuals compared to variants found only in the heterozygous state. The presence of any cryptic splice sites occurring within 6bp of a canonical splice site automatically lead to a not LoF classification when evaluated in the heterozygous state. However, cryptic splice sites required a strong rescue prediction by in silico splice predictors in order to achieve the same verdict for a variant in the homozygous state.

### Caveats

These curations are based on the presence of these variants in the gnomAD database and do not take into account the presence of these variants in individuals with documented disease. We view LoF curation as an important step to be taken to evaluate whether a variant is expected to result in LoF and would follow this with curation for the clinical impact (pathogenic, benign, etc.) of a variant following ACMG’s Standards and guidelines for the interpretation of sequence variants ([Richards et al. 2015](https://www.nature.com/articles/gim201530)). Therefore, even if a variant is classified as LoF or likely LoF, it may not meet criteria for pathogenicity with respect to human disease. Additionally, the curation of a variant as LoF, likely LoF, uncertain, likely not LoF, and not LoF is not in any way determined based on functional evidence. Rather, predictions are entirely based on manual interpretation of splicing, conservation, annotations, and sequence data quality in gnomAD and the UCSC genome browser.

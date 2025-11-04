---
id: lof-curation
title: Loss-of-Function Curation
---

The Loss-of-Function (LoF) classification is a result of a specialized and **manual** curation of predicted loss of function (pLoF) variants that have passed all LOFTEE filters and other QC flags in gnomAD, and determines how likely these variants are to result in loss of function. For each curated variant, two curators performed an independent curation, and this is a process that yields a **prediction** for the likelihood of loss of function. Note that these predictions are based on _in silico_ metrics only, and do not incorporate experimental evidence. This work is now published in the American Journal of Human Genetics ([Singer-Berk et al. 2023](https://pubmed.ncbi.nlm.nih.gov/37633279/)).

### Classification Categories

pLoF curated variants are assigned one of five classifications based on the presence or absence of certain flags (described below). These classifications include: _LoF, likely LoF, uncertain LoF, likely not LoF, and not LoF_. Variants classified as _LoF_ have no error modes that indicate they may escape NMD (nonsense mediated decay), while variants classified as _not LoF_ have some indication that they may escape NMD. Similar to ACMG/AMP criteria for likely pathogenic and likely benign classification of variants, _likely LoF_ and _likely not LoF_ classified variants are less confidently predicted to result in NMD or to escape NMD, respectively. Variants with an _uncertain LoF_ classification are similar to the ACMG/AMP variants of uncertain significance (VUS’s), and do not have sufficient evidence to predict if the result would be NMD or escaping NMD.

### How is this useful?

For _likely LoF_ and _LoF_ variants, this manual curation provides increased confidence that these variants are truly LoF variants for a gene and should result in NMD, by systematically ruling out a number of common annotation and sequencing error modes. Ultimately, however, functional studies would be needed to fully validate the potential LoF impact of a variant.

For _likely not LoF_ and _not LoF_ variants, this curation supports the conclusion that either these variants are likely the result of a technical sequencing error, or their predicted effect based on our extensive manual curation is to escape NMD. For those variants with technical errors that are also classified as _not LoF_, the allele frequency of these variants in gnomAD should not be considered the true frequency of these variants. For other variants that have been curated as _likely not LoF_ and _not LoF_, these may still be pathogenic variants, but they are expected to escape NMD.

### LoF Curation Flags

#### Mapping Issue Flag

There is a potential mapping issue for variants in this region as identified by repeat tracks (Mappability, RepeatMasker, Segmental Dups, Self Chain, and Simple Repeats) in the UCSC genome browser ([Kent et al. 2002](https://pubmed.ncbi.nlm.nih.gov/12045153/)). Mapping Error may also be flagged in the case of visual inspection of mapping issues in the IGV reads in gnomAD.

#### Genotyping Issue Flag

Quality of variant calls is at the lower end of the allowed “passing” threshold based on allele balance, depth, and genotype quality scores so there is reduced confidence that this variant is real (i.e. not a sequencing artifact) or that it would result in loss of function in the individual in gnomAD. This flag may also indicate a region that has low complexity, is GC rich, or has evidence of polymerase stuttering.

#### Homopolymer Flag

This flag was used when an indel variant falls within a homopolymer repeat. Homopolymers are defined as single nucleotide, dinucleotide, or trinucleotide motifs that are repeated in the reference sequence at least 5-7 times.

#### No Read Flag

No read data was available for visualization of individuals with this variant in gnomAD (in the most up to date version as well as previous versions). In some cases we could still determine a variant was _not LoF_, due to other errors. Variants without any read data were curated as _uncertain_LoF_ if there was no indication of other major errors.

#### Reference Error Flag

The variant was called due to an error or rare variant in the human genome reference sequence GRCh37/hg19, and therefore is present at a far higher than expected frequency (>99% MAF) across all gnomAD populations. Additionally, these variants may appear as gaps in the UCSC genome browser or as falling within small artificial intronic sequences of <5bp bp in length. Most of these have been corrected in GRCh38.

#### Strand Bias Flag

The variant shows evidence of strand imbalance where it is unevenly distributed among forward or reverse strands. Strand bias in exome/genome data in variants at intron-exon boundaries has been previously described, so this error mode was not flagged in canonical splice site variants ([Guo et al. 2012](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3532123/)).

#### MNV (Multi-nucleotide variants) / Frame-restoring Indel Flag

##### MNV

The variant is observed in _cis_ with at least one other variant in the same codon. When combining both variants, the predicted change is a missense or synonymous variant rather than a termination event, which would have been predicted from one of the pair of variants alone.

##### Frame-restoring indel

This flag indicated there are at least two indels that were observed in _cis_. While at least one of these indels would have resulted in a frameshift and is therefore a pLoF variant, the other indel restores the reading frame, and is thus predicted to result in an in-frame indel (potentially with an intervening stretch of out-of-frame sequence), rather than a variant that results in NMD. This flag may also be used for tandem repeats occurring near splice sites that are predicted to undergo normal splicing and maintain the reading frame.

#### Splice Rescue Flag

_In silico_ splice predictors predict a cryptic in-frame splice site that rescues a canonical splice site abolished by the pLoF variant in question without including stop codons. These cryptic sites may be either up or downstream of the canonical splice site. These essential splice site rescues are detected using SpliceAI and or Pangolin. To be considered a splice rescue, spliceAI and pangolin must agree on the prediction of an in-frame rescue. Additionally, if there is an additional prediction of an out-of-frame cryptic rescue, this must be at a significantly lower score (defined by score >0.2 from the in-frame rescue), in order for the pLoF variant to be classified as _likely not LoF_ or _not LoF_.

#### Variant with In-frame Exon Skipping Prediction Flag

_In silico_ splice predictors predict skipping of the adjacent exon (which is in-frame), usually using spliceAI and pangolin. The predictions must agree across predictors. Skipping of this exon will maintain the reading frame and is not predicted to result in NMD. The skipping of this exon will also remove <25% of the coding sequence for the gene. Additionally, if there is an additional prediction of an out-of-frame cryptic rescue, this must be at a significantly lower score (defined by score >0.2 from the in-frame exon predictions), in order for the pLoF variant to be classified as _likely not LoF_ or _not LoF_.

#### Conflicting Splice Prediction Flag

_In silico_ splice predictors disagree on the prediction for the variant. There are multiple predictions that have both in-frame and out-of-frame consequences. It is not possible to distinguish the likelihood that this would escape NMD. These variants are classified as uncertain_LoF.

#### Weak/Unrecognized Splice Rescue Flag

_In silico_ splice predictors predict a weak rescue of a canonical splice site variant by a cryptic in-frame splice site upstream or downstream of the canonical splice site.

#### Minority of Transcripts Flag

Variants are annotated as LoF in less than or equal to 50% of protein-coding **GENCODE** transcripts for the gene ([Harrow et al. 2012](https://pubmed.ncbi.nlm.nih.gov/22955987/)). GENCODE transcripts (rather than Ensembl or RefSeq) transcripts were selected for these curations because they are a refined transcript set built on various types of evidence.

#### Weak Exon Conservation Flag

Variant falls within an exon that is **more weakly conserved relative to the entire gene** for all vertebrates in UCSC genome browser. Conservation is visually assessed in the UCSC genome browser using PhyloP ([Pollard et al. 2010](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2798823/)).

#### Partial Exon Conservation Flag

The variant falls within an exon that is **partially**, but not fully, conserved relative to the entire gene for all vertebrates in UCSC genome browser. Conservation is visually assessed in the UCSC genome browser using PhyloP.

#### Weak Gene Conservation Flag

The variant falls within a gene where the entire gene is weakly conserved as visually assessed in the UCSC genome browser using PhyloP.

#### Last Exon Flag

The variant results in a termination event that falls within the last coding exon or within the last 50bp of the penultimate exon of the gene, and occurs at a position of the gene that retains more than 25% of the gene’s coding sequence.

#### Other Transcript Error Flag

This flag could refer to several possible error modes, all related to situations in which we believe that the affected transcripts are either sequencing artifacts, or are unlikely to be biologically critical:

- The variant falls within an “extension” of the exon in a transcript in which the majority of transcripts for the gene do not have the same extended portion. This region is also poorly conserved across vertebrates in the UCSC genome browser and has a lower mean pext score relative to the mean pext for the gene.
- The variant is in a gene where there are at least 2 transcripts that exist in different frames (overprinting), and the variant is annotated as LoF in at least one of those transcripts.
- A nonsense variant that falls within the first coding exon for the gene, for which there is a downstream methionine, that is well conserved across vertebrates and could rescue initiation of translation for this transcript.

#### Low Relative Mean Pext / Pext Does not Support Splicing Flag

The pext score is a metric that captures the expression of all transcripts overlapping the affected base across a variety of adult human tissues, calculated from the GTEx dataset ([Cummings et al. 2020](https://www.nature.com/articles/s41586-020-2329-2)). This flag means that the exon/region affected by the variant is weakly expressed compared to other exons in the gene. Low pext is typically defined as a region of the gene with a mean pext score across tissues being <20% of the maximum mean pext across the gene. As mean pext across all tissues was used for curation, alternative interpretations may be supported for variants in genes that are known to exhibit highly tissue-specific expression.

Alternatively, there is a splicing variant in an exon where pext does not support splicing of that exon to occur at that position. For example, a gene may have two transcripts with overlapping exons of different lengths, such that a splice variant in the shorter version of the exon would fall in the coding region of the longer version of the exon. A high pext (indicating expression) for the longer exon would lend more support to the longer exon being the more biologically relevant version. Thus, the splice variant in the shorter transcript would not be as strongly supported.

#### Partially Decreased Relative Pext Flag

The pext score is a metric that captures the expression of all transcripts overlapping the affected base across a variety of adult human tissues, calculated from the GTEx dataset ([Cummings et al. 2020](https://www.nature.com/articles/s41586-020-2329-2)). This flag means that the variant is located in an exon/region of an exon that has a slightly reduced mean pext score compared to the rest of the gene. A slightly reduced pext score was defined as a mean pext score of <50% of the max pext for the gene. If this flag is in combination with other flags (e.g. minority transcripts/exon conservation), then the classification of the variant will likely be _uncertain LoF_ or _likely not LoF/not LoF_. As mean pext across all tissues was used for curation, alternative interpretations may be supported for variants in genes that are known to exhibit predominately tissue-specific expression.

#### LoF in Untranslated Transcript Flag

The variant falls in a transcript that is not a translated transcript. Therefore, the variant is not in a biologically relevant transcript. These transcripts were identified by having stop codons scattered throughout the transcript by visualization in the UCSC genome browser.

#### Coverage Issue Flag

The variant falls within a region of the gene where the per-base mean depth of coverage is very low (generally less than 20X) in both exome and genome data.

#### Uninformative Pext Flag

The variant falls within a gene that has a low mean pext across the entirety of the gene and has weak gene conservation, or the variant falls within a minority of transcripts with no other flags that indicate it is _not LoF_. Alternatively, the variant falls within a gene that is not expressed in GTEx, the gene is too large to assess with pext scores, pext was too difficult to visualize across the gene, or there is a small transcript for the gene that is more highly expressed compared to the canonical/MANE transcript for the gene and therefore distorts the pext scores.

### Homozygous versus Heterozygous Curations

All homozygous pLoF variants in gnomAD v2 were curated as part of the efforts taken in [Karczewski et al. 2020 Nature](https://www.nature.com/articles/s41576-020-0255-7) paper to identify genes that were tolerant of complete knockout in humans, and therefore these curations tended to be more stringent. Therefore, certain error modes are applied differently depending on whether the variant appears in the homozygous versus heterozygous state in gnomAD. This difference in interpretation is based on the more unlikely chance that an artifact would be seen in the homozygous state versus a heterozygous state.

### Caveats

These curations are based on the presence of these variants in the gnomAD database and do not take into account the presence of these variants in individuals with documented disease. We view LoF curation as an important step to be taken to evaluate whether a variant is expected to result in NMD and would follow this with curation for the clinical impact (pathogenic, benign, etc.) of a variant following ACMG/AMP’s Standards and guidelines for the interpretation of sequence variants ([Richards et al. 2015](https://www.nature.com/articles/gim201530)). Therefore, even if a variant is classified as _LoF_ or _likely LoF_, it may not meet criteria for pathogenicity with respect to human disease. Additionally, the curation of a variant as _LoF_, _likely LoF_, _uncertain_, _likely not LoF_, and _not LoF_ is not in any way determined based on functional evidence. Rather, predictions are entirely based on manual interpretation of splicing, conservation, annotations, and sequence data quality in gnomAD and the UCSC genome browser.

---
question: 'What are the meanings of the mitochondrial-specific filters and flags?'
---

Mitochondrial variants were subjected to mitochondrial-specific filters and flags. Filters are used to exclude specific genotypes, variants, or sites from population counts. Genotype filters exclude alleles in individual samples (e.g. poor base quality or low heteroplasmy in that sample), whereas variant filters exclude the allele in all individuals for a given variant, and site filters exclude all variants at a given position (eg all indel and SNP variants overlapping chrM:310). Flags are warnings applied to PASS variants to aid interpretation. The number of filtered genotypes is reported in the excluded allele count ("excluded_AC"), and a histogram is available on variant pages to view the counts of specific filters across different heteroplasmy levels, but these genotypes are not used for allele count and allele frequency calculations.

- artifact_prone_site (site-level filter): This is one of 6 specific mtDNA positions (301, 302, 310, 316, 3107, 16182) where sequence context makes it difficult to distinguish true variants from technical artifacts, and therefore all variants overlapping these sites are filtered out. The homopolymer tracts at location chrM:300-317 (AAACCCCCCCTCCCCCGC) cause Illumina sequencing errors in all samples and cause (i) a large coverage dip in this region, (ii) reads with many apparent indels near position chrM:310T, and (iii) apparent substitutions of chrM:301A→C, chrM:302A→C, chrM:310T→C, and chrM:316G→C. Similarly, homopolymer tracts at location chrM:16180-16193 (AAAACCCCCTCCCC) cause errors and apparent indels at position chrM:16182. The reference genome contains "N" at position chrM:3107, which causes misalignment of many reads.

- indel_stack (variant filter): Similar to artifact-prone sites, certain indels create a homopolymer tract that causes a drop in coverage and technical sequencing artifacts in multiple individuals. For example, an individual with an insertion at position chrM:5892 would typically show multiple alternate alleles (e.g., REF=T, ALT= TC, TCC, TCCC, TCCCCC, TCCCCC, TCCCCCCCC), which represents a multi-allelic call in this sample. Indels that are only present within multi-allelic calls across all samples in the callset are filtered out using this flag. For example, of the 182 different indel variants observed at position chrM:5892, 102 are only detected within multi-allelic calls and are filtered out as indel_stack, whereas alternate variants such as chrM:5892T→TC and chrM:5892T→TCC are not always in multi-allelic calls and will pass filters.

- npg (variant filter): No sample had a pass genotype for the variant (no pass genotype).

- common_low_heteroplasmy (variant warning flag): This flag is present if the variant is found at an overall frequency of .001 across all samples with a PASS genotype and heteroplasmy level > 0% and < 50% (includes variants < 1% heteroplasmy which are subsequently filtered). This flag indicates that low-heteroplasmy alleles at these variants are likely to be enriched for sequencing errors and NUMT misalignments (which are common across samples), however homoplasmic alleles at these variants will be high quality and can be trusted.

- base_qual (genotype filter): Median base quality for alternate allele was below minimum (using default of 20 for "min-median-base-quality" parameter)

- heteroplasmy_below_min_het_threshold (genotype filter): Heteroplasmy level was below 10% in this sample

- position (genotype filter): Median distance of variant allele from end of reads was below minimum (using default of 1 for "min-median-read-position" parameter)

- strand_bias (genotype filter): Evidence for alternate allele comes from one read direction only

- weak_evidence (genotype filter): Mutation does not meet likelihood threshold

- contamination (genotype filter): Fails MuTect2 contamination filter based on [Haplocheck](https://github.com/genepi/haplocheck) (does not take into account the freemix value or our internal algorithm for calculating contamination)

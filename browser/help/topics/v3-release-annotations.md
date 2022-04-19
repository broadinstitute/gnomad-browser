---
id: v3-ht-annotations
title: 'gnomAD v3 Hail Table annotation descriptions'
---

The gnomAD v3 Hail Table annotations are defined below:

**Global fields**:

* **freq_meta**: Allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘freq’ array row annotation.
* **freq_index_dict**: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the ‘freq’ array row annotation.
* **faf_index_dict**: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (‘faf’) row annotation.
* **faf_meta**: Filtering allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘faf’ array row annotation.
* **VEP version**: VEP version that was run on the callset. 
* **vep_csq_header**: VEP header for VCF export.
* **dbsnp_version**: dbSNP version used in the callset.
* **filtering_model**: The variant filtering model used and its specific cutoffs.
    * **model_name**: Variant filtering model name used in the 'filters' row annotation, indicating the variant was filtered by this model during variant QC.
    * **score_name**: Annotation name of the score used for variant filtering.
    * **snv_cutoff**: SNV filtering cutoff information.
        * **bin**: Filtering percentile cutoff for SNVs.
        * **min_score**: Minimum score at SNV filtering percentile cutoff.
    * **indel_cutoff**: Indel filtering cutoff information.
        * **bin**: Filtering percentile cutoff for indels.
        * **min_score**: Minimum score at indel filtering percentile cutoff.
    * **model_id**: Variant filtering model ID for score data (used for internal specification of the model).
    * **snv_training_variables**: Variant annotations used as features in the SNV filtering model.
    * **indel_training_variables**: Variant annotations used as features in the indel filtering model.
* **age_distribution**: Callset-wide age histogram calculated on release samples.
    * **bin_edges**: Bin edges for the age histogram.
    * **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
    * **n_smaller**: Count of age values falling below lowest histogram bin edge.
    * **n_larger**: Count of age values falling above highest histogram bin edge.
* **freq_sample_count**: A sample count per sample grouping defined in the 'freq_meta' global annotation.

**Row fields**:

* **locus**: Variant locus. Contains contig and position information.
* **alleles**: Variant alleles.
* **freq**: Array of allele frequency information  (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD release. 
    * **AC**: Alternate allele count in release.
    * **AF**: Alternate allele frequency, (AC/AN), in release.
    * **AN**: Total number of alleles in release.
    * **homozygote_count**: Count of homozygous alternate individuals in release.
* **raw_qual_hists**: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
    * **gq_hist_all**: Histogram for GQ calculated on all genotypes.
        * **bin_edges**: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
        * **n_smaller**: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
        * **n_larger**: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
    * **dp_hist_all**: Histogram for DP calculated on all genotypes.
        * **bin_edges**: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
        * **bin_freq**: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
        * **n_smaller**: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
        * **n_larger**: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
    * **gq_hist_alt**: Histogram for GQ in heterozygous individuals calculated on all genotypes.
        * **bin_edges**: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        * **n_smaller**: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        * **n_larger**: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    * **dp_hist_alt**: Histogram for DP in heterozygous individuals calculated on all genotypes.
        *  **bin_edges**: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        * **n_smaller**: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        * **n_larger**: Count of DP values  in heterozygous individuals  falling above highest histogram bin edge, calculated on all genotypes.
    * **ab_hist_alt**: Histogram for AB in heterozygous individuals calculated on all genotypes.
        * **bin_edges**: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        * **bin_freq**: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        * **n_smaller**: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        * **n_larger**: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
* **popmax**: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked population with maximum allele frequency. Excludes Amish (ami), Ashkenazi Jewish (asj), European Finnish (fin), Middle Eastern (mid), and "Other" (oth) populations.
    * **AC**: Alternate allele count in the population with the maximum allele frequency.
    * **AF**: Maximum alternate allele frequency, (AC/AN), across populations in gnomAD.
    * **AN**: Total number of alleles in the population with the maximum allele frequency.
    * **homozygote_count**: Count of homozygous individuals in the population with the maximum allele frequency.
    * **pop**: Population with maximum allele frequency
    * **faf95**: Filtering allele frequency (using Poisson 95% CI) for the population with the maximum allele frequency. 
* **qual_hists**: Genotype quality metric histograms for high quality genotypes.
    * **gq_hist_all**: Histogram for GQ calculated on high quality genotypes.
        * **bin_edges**: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
        * **n_smaller**: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        * **n_larger**: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
    * **dp_hist_all**: Histogram for DP calculated on high quality genotypes.
        * **bin_edges**: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
        * **n_smaller**: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        * **n_larger**: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
    * **gq_hist_alt**: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
        * **bin_edges**: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        * **n_smaller**: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        * **n_larger**: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    * **dp_hist_alt**: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
        * **bin_edges**: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        * **bin_freq**: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        * **n_smaller**: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        * **n_larger**: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
    * **ab_hist_alt**: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
        * **bin_edges**: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        * **bin_freq**: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        * **n_smaller**: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        * **n_larger**: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
* **faf**: Filtering allele frequency.
    * **faf95**: Filtering allele frequency (using Poisson 95% CI).
    * **faf99**: Filtering allele frequency (using Poisson 99% CI).
* **a_index**: The original index of this alternate allele in the multiallelic representation (1 is the first alternate allele or the only alternate allele in a biallelic variant).
* **was_split**: True if this variant was originally multiallelic, otherwise False.
* **rsid**: dbSNP reference SNP identification (rsID) numbers.
* **filters**: Variant filters; AC0: Allele count is zero after filtering out low-confidence genotypes (GQ &lt; 20; DP &lt; 10; and AB &lt; 0.2 for het calls), AS_VQSR: Failed allele-specific VQSR filtering thresholds of -2.7739 for SNPs and -1.0606 for indels, InbreedingCoeff: GATK InbreedingCoeff &lt; -0.3, PASS: Passed all variant filters.
* **info**: Struct containing typical GATK allele-specific (AS) info fields and additional variant QC fields.
    * **QUALapprox**: Sum of PL[0] values; used to approximate the QUAL score.
    * **SB**: Per-sample component statistics which comprise the Fisher's exact test to detect strand bias. Values are: depth of reference allele on forward strand, depth of reference allele on reverse strand, depth of alternate allele on forward strand, depth of alternate allele on reverse strand.
    * **MQ**: Root mean square of the mapping quality of reads across all samples.
    * **MQRankSum**: Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
    * **VarDP**: Depth over variant genotypes (does not include depth of reference samples).
    * **AS_ReadPosRankSum**: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
    * **AS_pab_max**: Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of 0.5.
    * **AS_QD**: Allele-specific variant call confidence normalized by depth of sample reads supporting a variant.
    * **AS_MQ**: Allele-specific root mean square of the mapping quality of reads across all samples.
    * **QD**: Variant call confidence normalized by depth of sample reads supporting a variant.
    * **AS_MQRankSum**: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
    * **FS**: Phred-scaled p-value of Fisher's exact test for strand bias.
    * **AS_FS**: Allele-specific phred-scaled p-value of Fisher's exact test for strand bias.
    * **ReadPosRankSum**: Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
    * **AS_QUALapprox**: Allele-specific sum of PL[0] values; used to approximate the QUAL score.
    * **AS_SB_TABLE**: Allele-specific forward/reverse read counts for strand bias tests.
    * **AS_VarDP**: Allele-specific depth over variant genotypes (does not include depth of reference samples).
    * **AS_SOR**: Allele-specific strand bias estimated by the symmetric odds ratio test.
    * **SOR**: Strand bias estimated by the symmetric odds ratio test.
    * **singleton**: Variant is seen once in the callset.
    * **transmitted_singleton**: Variant was a callset-wide doubleton that was transmitted within a family from a parent to a child (i.e., a singleton amongst unrelated samples in cohort).
    * **omni**: Variant is present on the Omni 2.5 genotyping array and found in 1000 Genomes data.
    * **mills**: Indel is present in the Mills and Devine data.
    * **monoallelic**: All samples are homozygous alternate for the variant.
    * **AS_VQSLOD**: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
    * **InbreedingCoeff**: Inbreeding coefficient, the excess heterozygosity at a variant site, computed as 1 - (the number of heterozygous genotypes) / (the number of heterozygous genotypes expected under Hardy-Weinberg equilibrium).
* **vep**: Consequence annotations from Ensembl VEP. More details about VEP output is described [here](https://ensembl.org/info/docs/tools/vep/vep_formats.html#output). VEP was run using the LOFTEE plugin and information about the additional LOFTEE annotations can be found [here](https://github.com/konradjk/loftee).
* **vqsr**: VQSR related variant annotations.
    * **AS_VQSLOD**: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
    * **AS_culprit**: Allele-specific worst-performing annotation in the VQSR Gaussian mixture model.
    * **NEGATIVE_TRAIN_SITE**: Variant was used to build the negative training set of low-quality variants for VQSR.
    * **POSITIVE_TRAIN_SITE**: Variant was used to build the positive training set of high-quality variants for VQSR.
* **region_flag**: Struct containing flags for problematic regions.
    * **lcr**: Variant falls within a low complexity region.
    * **segdup**: Variant falls within a segmental duplication region.
* **allele_info**: Allele information.
    * **variant_type**: Variant type (snv, indel, multi-snv, multi-indel, or mixed).
    * **allele_type**: Allele type (snv, insertion, deletion, or mixed).
    * **n_alt_alleles**: Total number of alternate alleles observed at variant locus.
    * **was_mixed**: Variant type was mixed.
* **age_hist_het**: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
    * **bin_edges**: Bin edges for the age histogram.
    * **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
    * **n_smaller**: Count of age values falling below lowest histogram bin edge.
    * **n_larger**: Count of age values falling above highest histogram bin edge.
* **age_hist_hom**: Histogram for age in all homozygous release samples calculated on high quality genotypes.
    * **bin_edges**: Bin edges for the age histogram.
    * **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
    * **n_smaller**: Count of age values falling below lowest histogram bin edge.
    * **n_larger**: Count of age values falling above highest histogram bin edge.
* **cadd**:
    * **phred**: Cadd Phred-like scores ('scaled C-scores') ranging from 1 to 99, based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values are more deleterious.
    * **raw_score**: Raw CADD scores are interpretable as the extent to which the annotation profile for a given variant suggests that the variant is likely to be 'observed' (negative values) vs 'simulated' (positive values). Larger values are more deleterious.
    * **has_duplicate**:Whether the variant has more than one CADD score associated with it.
* **revel**:
    * **revel_score**: dbNSFP's Revel score from 0 to 1. Variants with higher scores are predicted to be more likely to be deleterious.
    * **has_duplicate**: Whether the variant has more than one revel_score associated with it.
* **splice_ai**:
    * **splice_ai**: The maximum delta score, interpreted as the probability of the variant being splice-altering.
    * **splice_consequence**: The consequence term associated with the max delta score in 'splice_ai_max_ds'.
    * **has_duplicate**: Whether the variant has more than one splice_ai score associated with it.
* **primate_ai**:
    * **primate_ai_score**: PrimateAI's deleteriousness score from 0 (less deleterious) to 1 (more deleterious).
    * **has_duplicate**: Whether the variant has more than one primate_ai_score associated with it.
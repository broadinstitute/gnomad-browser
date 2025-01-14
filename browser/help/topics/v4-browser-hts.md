---
id: v4-browser-hts
title: 'gnomAD v4 Browser Hail Tables'
---

In addition to our [variants tables](/downloads#v4-variants), we release two data tables underlying the gnomAD browser. These tables enable our users to more easily incorporate gnomAD data into external pipelines and analyses in a manner consistent with what they see in the browser.

## gnomAD v4.1 exome/genome/joint variant table

To convert the standard gnomAD variant release tables into a format more suitable for browser display, we join the exome, genome, and joint tables on locus/allele to create a single table. This process ensures that they share the same site-level annotations, thus saving space and optimizing database/API queries. Additionally, allele counts and frequencies are structured in a JSON-like format that is more easily consumable by web applications. The table may also include subset data not visible in the browser.

Each row (i.e., variant) in this table will have distinct allele frequency information and quality metrics depending whether it was present in the exome or genome callsets but will share common annotations such as [VEP annotations](https://useast.ensembl.org/info/docs/tools/vep/index.html) and _in silico_ predictors.

The script for how this table is created can be found [here](https://github.com/broadinstitute/gnomad-browser/blob/main/data-pipeline/src/data_pipeline/pipelines/gnomad_v4_variants.py).

## gnomAD v4.1/v2.1 genes tables

These tables underlie the gene models data seen in the browser, which contains detailed information on exon-coding regions, transcripts, identifiers, gene constraint, and co-occurrence data. The data from these tables are derived from [GENCODE](https://www.gencodegenes.org/human/release_39.html), the [HUGO Gene Nomenclature Committee (HGNC)](https://www.genenames.org/), [MANE transcripts](https://www.ncbi.nlm.nih.gov/refseq/MANE/), [GTEx](https://gtexportal.org/home/) (coming soon), and from gnomAD secondary analyses.

The script for how this table is created can be found [here](https://github.com/broadinstitute/gnomad-browser/blob/main/data-pipeline/src/data_pipeline/pipelines/genes.py).

# Browser Hail Table Field Descriptions

#### gnomAD v4.1 browser variant Hail Table annotations

Global fields:

- `mane_select_version`: MANE Select version used to annotate variants.

Row fields:

- `locus`: Variant locus. Contains contig and position information.
- `alleles`: Variant alleles.
- `exome`: Struct containing information about variant from exome data.
  - `colocated_variants`: Struct containing array of variants located at the same Locus as this variant, e.g. for the variant `1-55051215-G-GA`, the variants `1-55051215-G-A` and `1-55051215-G-T` are colocated.
    - `all`: An array containing colocated variants that are present in the entire exome dataset.
    - `non_ukb`: An array containing colocated variants that are present in the non-UK Biobank (UKB) subset of the dataset.
  - `subsets`: A set containing the subsets this variant is seen in.
  - `flags`: A set containing the flags about the region this variant falls in. See `region_flags` description on the v4 Hail Tables [help page](v4-hts#region-flags).
  - `freq`: A struct containing variant frequency information for each subset.
  - `all`: Struct containing variant frequency information calculated across all samples.
    - `ac`: The alternate allele count for this variant calculated across high-quality genotypes (genotypes with depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes). This is the allele count displayed in the gnomAD browser (not `ac_raw` below).
    - `ac_raw`: The alternate allele count for this variant calculated across unadjusted genotypes.
    - `an`: Total number of alleles for this locus.
    - `hemizygote_count`: Number of hemizygous alternate individuals.
    - `homozygote_count`: Number of homozygous alternate individuals.
    - `ancestry_groups`: Array containing variant frequency information stratified per genetic ancestry group.
      - `id`: Three letter identifier for this genetic ancestry group, e.g. `amr` or `sas`.
      - `ac`: Alternate allele count for this variant in this genetic ancestry group.
      - `an`: Total number of alleles for this locus for this genetic ancestry group.
      - `hemizygote_count`: Number of hemizygous alternate individuals in this genetic ancestry group.
      - `homozygote_count`: Number of homozygous alternate individuals in this genetic ancestry group.
    - `non_ukb`: Struct containing variant frequency information from the non-UKB subset. Includes same fields as above struct (`all`).
  - `fafmax`: Struct containing information about the maximum FAF.
    - `gnomad`: Struct containing information about the fafmax for all of gnomad for the exome data.
      - `faf95_max`: Max FAF value for the (95% CI).
      - `faf95_max_gen_anc`: Genetic ancestry group associated with the grpmax FAF (95% CI).
      - `faf99_max`: Max FAF(99% CI).
      - `faf99_max_gen_anc`: Genetic ancestry group associated with the max FAF (99% CI).
    - `non_ukb`: Struct containing fafmax information for non-UKB subset (exome data only).
  - `age_distribution`: Struct containing age distribution information for variant.
    - `het`: Struct containing age distribution information for individuals heterozygous for this variant. Structured to allow easy histogram creation.
      - `bin_edges`: Array containing the edges of each bin of the histogram.
      - `bin_freq`: Array containing the frequency of individuals in this bin.
      - `n_smaller`: Number of individuals with lower age than the lowest bin.
      - `n_larger`: Number of individuals with a higher age than the highest bin.
    - `hom`: Struct containing age distribution information for individuals homozygous for this variant. Structured to allow easy histogram creation. Contains same fields as `het` above.
  - `filters`: Set containing variant QC filters. See `filters` description on the v4 Hail Tables [help page](v4-hts#filters).
  - `quality_metrics`: Struct containing variant quality metric histograms information.
    - `allele_balance`: Struct containing variant allele balance histograms information.
      - `alt_adj`: Struct containing variant allele balance information calculated across high-quality genotypes. Contains same fields as other histogram structs. This data is displayed in the "Allele balance for heterozygotes" histogram in the browser's variant page.
      - `alt_raw`: Struct containing variant allele balance information calculated across unadjusted genotypes. Contains same fields as other histogram structs.
    - `genotype_depth`: Struct containing information used to display genotype depth (DP) histograms.
      - `all_adj`: Struct containing DP information calculated using high-quality genotypes. Contains same fields as other histogram structs.
      - `all_raw`: Struct containing DP information calculated across unadjusted genotypes. Contains same fields as other histogram structs.
      - `alt_adj`: Struct containing DP information calculated using high-quality genotypes (variant carriers only). Contains same fields as other histogram structs.
      - `alt_raw`: Struct containing DP information calculated across unadjusted genotypes (variant carriers only). Contains same fields as other histogram structs.
    - `genotype_quality`: Struct containing information used to display genotype quality (GQ) histograms.
      - `all_adj`: Struct containing GQ information calculated using high-quality genotypes. Contains same fields as other histogram structs.
      - `all_raw`: Struct containing GQ information calculated across unadjusted genotypes. Contains same fields as other histogram structs.
      - `alt_adj`: Struct containing GQ information calculated using high-quality genotypes (variant carriers only). Contains same fields as other histogram structs.
      - `alt_raw`: Struct containing GQ information calculated across unadjusted genotypes (variant carriers only). Contains same fields as other histogram structs.
  - `site quality metrics`: Array containing site quality metric information.
    - `metric`: Metric name (e.g., `inbreeding_coeff).
    - `value`: Metric value.
- `genome`: Struct containing information about this variant from genome data. Contains all the same fields as the exome data, with the exception that the subsets are (`all` `hgdp`, `tgp`) instead of (`all`, `non_ukb`).
- `joint`: Struct containing information about this variant for the joint exome and genome data.
  - `freq`: A struct containing variant frequency information.
    - `all`: Struct containing variant frequency information calculated across the combined (joint) gnomAD exomes and genomes. Contains the same fields as exomes `freq.all` struct.
  - `faf`: Array of combined exomes and genomes filtering allele frequency information. See `faf` description on the v4 Hail Tables [help page](/v4-hts#joint-faf).
  - `fafmax`: Struct containing information about the maximum FAF. Contains same fields as exomes `fafmax.gnomad` struct.
  - `grpmax`: Allele frequency information for the non-bottlenecked genetic ancestry group with the maximum alelle frequency. See `grpmax` description on the v4 Hail Tables [help page](/v4-hts#joint-grpmax).
  - `histograms`: Variant information histograms from the joint gnomAD exomes and genomes. See `histograms` description on the v4 Hail Tables [help page](v4-hts#joint-histograms).
    - `qual_hists`: Genotype quality metric histograms for high quality genotypes. See v4 Hail Tables [help page](v4-hts#joint-histograms).
    - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes. See v4 Hail Tables [help page](v4-hts#joint-histograms).
    - `age_hists`: Histograms containing age information for release samples. See v4 Hail Tables [help page](v4-hts#joint-age-histograms)
  - `flags`: Set containing flags about joint exome and genome data, possible values are [`discrepant_frequencies`, `not_called_in_exomes`, and `not_called_in_genomes`].
  - `freq_comparison_stats`: Struct containing results from contingency table and Cochran-Mantel-Haenszel tests comparing allele frequencies between the gnomAD exomes and genomes. See `freq_comparison_stats` description on the v4 Hail Tables [help page](/v4-hts#joint-freq-comparison-stats).
- `rsids`: dbSNP reference SNP identification (rsID) numbers.
- `in_silico_predictors`: Variant prediction annotations. Struct contains prediction scores from multiple in silico predictors. See `in_silico_predictors` description on the v4 Hail Tables [help page](v4-hts#in-silico-predictors).
- `variant_id`: gnomAD variant ID.
- `faf95_joint`: A struct containing joint (exome + genome) FAF information (95% CI).
  - `grpmax`: Groupmax FAF value for all genetic ancestry groups across exomes + genomes.
  - `grpmax_gen_anc`: Genetic ancestry group associated with the value `grpmax` above.
- `faf99_joint`: A struct containing joint (exome + genome) FAF (99% CI). Contains same fields as `faf95_joint`.
- `colocated_variants`: Array containing all variants (exome + genome) that are located at the same locus as this variant.
- `coverage`: Struct containing coverage information for locus.
  - `exome`: Struct containing exome coverage information.
    - `mean`: Mean depth of coverage at this locus.
    - `median`: Median depth of coverage at this locus.
    - `over_1`: Percentage of samples with a coverage greater than 1 at this locus.
    - `over_5`: Percentage of samples with a coverage greater than 5 at this locus.
    - `over_10`: Percentage of samples with a coverage greater than 10 at this locus.
    - `over_15`: Percentage of samples with a coverage greater than 15 at this locus.
    - `over_20`: Percentage of samples with a coverage greater than 20 at this locus.
    - `over_25`: Percentage of samples with a coverage greater than 25 at this locus.
    - `over_30`: Percentage of samples with a coverage greater than 30 at this locus.
    - `over_50`: Percentage of samples with a coverage greater than 50 at this locus.
    - `over_100`: Percentage of samples with a coverage greater than 100 at this locus.
  - `genome`: Struct containing genome coverage information. Contains the same fields as `exome` above.
- `transcript_consequences`: Array containing variant transcript consequence information.
  - `biotype`: Transcript biotype.
  - `consequence_terms`: Array of predicted functional consequences.
  - `domains`: Set containing protein domains affected by variant.
  - `gene_id`: Unique ID of gene associated with transcript.
  - `hgvsc`: HGVS coding sequence notation for variant.
  - `hgvsp`: HGVS protein notation for variant.
  - `is_canonical`: Whether transcript is the canonical transcript.
  - `lof_filter`: Variant LoF filters (from [LOFTEE](https://github.com/konradjk/loftee)).
  - `lof_flags`: LOFTEE flags.
  - `lof`: Variant LOFTEE status (high confidence `HC` or low confidence `LC`).
  - `major_consequence`: Primary consequence associated with transcript.
  - `transcript_id`: Unique transcript ID.
  - `transcript_version`: Transcript version.
  - `gene_version`: Gene version.
  - `is_mane_select`: Whether transcript is the MANE select transcript.
  - `is_mane_select_version`: MANE Select version; has a value if this transcript is the MANE select transcript.
  - `refseq_id`: RefSeq ID associated with transcript.
- `refseq_version`: RefSeq version.
- `caid`: The ClinGen Allele ID associated with this variant.
- `vrs`: Struct containing information about this variant in accordance with the [Variant Representation (VRS)](https://vrs.ga4gh.org/en/stable/) standard.
  - `ref`: Struct containing information about the reference allele.
    - `allele_id`: The unique Allele ID.
    - `start`: The start position of the Allele.
    - `end`: The end position of the Allele.
    - `state`: A VRS Sequence Expression that corresponds to the nucleotide or amino acid sequence of the Allele.

#### gnomAD v4.1. browser gene models Hail Table annotations

Global fields:

- `mane_select_version`: MANE Select version used to annotate variants (only present on GRCh38 Gene Models Hail Table).

Row fields:

- `interval`: Struct representing start and end positions of gene.
- `gene_id`: Unique ensembl gene ID.
- `gene_version`: Gene version.
- `gencode_symbol`: GENCODE gene symbol.
- `chrom`: Chromosome in which gene is located.
- `strand`: Gene strand.
- `start`: Gene genomic start position (position only).
- `stop`: Gene genomic stop position (position only).
- `xstart`: Gene genomic start position (format: chromosomeposition). xstart can be calculated with ((chrom \* 10<sup>9</sup>) + pos), note that chrX is encoded as 23, chrY as 24, and chrM as 25. e.g. `1-55051215` becomes `1055051215`, and `X:9786429` becomes `23009786429`.
- `xstop`: Gene genomic stop position (format: chromosomeposition).
- `exons`: Array containing exon information for gene.
  - `feature_type`: Exon type (e.g., CDS).
  - `start`: Exon genomic start position (position only).
  - `stop`: Exon genomic stop position (position only).
  - `xstart`: Exon genomic start position (format: chromosomeposition).
  - `xstop`: Exon genomic stop position (format: chromosomeposition).
- `transcripts`: Array containing information about transcripts associated with the gene.
  - `interval`: Struct representing the start and end positions of transcript.
  - `transcript_id`: Unique transcript ID.
  - `transcript_version`: Transcript version.
  - `gene_id`: Unique gene ID.
  - `gene_version`: Gene version.
  - `chrom`: Chromosome in which transcript is located.
  - `strand`: Transcript strand.
  - `start`: Transcript genomic start position (position only).
  - `stop`: Transcript genomic stop position (position only).
  - `xstart`: Transcript genomic start position (format: chromosomeposition).
  - `xstop`: Transcript genomic stop position (format: chromosomeposition).
  - `exons`: Array containing transcript exon information.
    - `feature_type`: Exon type (e.g., CDS).
    - `start`: Exon genomic start position (position only).
    - `stop`: Exon genomic stop position (position only).
    - `xstart`: Exon genomic start position (format: chromosomeposition).
    - `xstop`: Exon genomic start position (format: chromosomeposition).
  - `reference_genome`: Reference genome associated with this transcript.
  - `gtex_tissue_expression`: Array containing [GTEx](https://gtexportal.org/home/) v10 information.
    - `tissue`: The tissue type, e.g. 'brain_cerebellum'.
    - `value`: The Transript Per Million (TPM) value associated with the tissue.
  - `refseq_id`: Transcript RefSeq ID.
  - `refseq_version`: RefSeq version.
- `hgnc_id`: HGNC gene ID.
- `symbol`: Gene symbol.
- `name`: Gene name.
- `previous_symbols`: Set containing previous gene symbols.
- `alias_symbols`: Set containing alternate gene symbols.
- `omim_id`: Gene OMIM ID.
- `ncbi_id`: Gene NCBI ID.
- `symbol_upper_case`: All-caps gene symbol.
- `search_terms`: Set containing search terms associated with gene.
- `reference_genome`: Reference genome build associated with this gene.
- `flags`: Set containing gene flags for this gene.
- `canonical_transcript_id`: Canonical transcript ID.
- `mane_select_transcript`: Struct containing MANE Select transcript information.
  - `matched_gene_version`: Version of the matched gene.
  - `ensembl_id`: Transcript Ensembl ID.
  - `ensembl_version`: Ensembl version.
  - `refseq_id`: Transcript RefSeq ID.
  - `refseq_version`: RefSeq version.
- `pext`: Struct containing [pext](https://gnomad.broadinstitute.org/help/pext) information.
  - `regions`: Array containing pext information by region.
    - `chrom`: The chromosome in which the region is located.
    - `start`: Region genomic start position (position only).
    - `stop`: Region genomic stop position (position only).
    - `mean`: Mean expression across all tissues for the region.
    - `tissues`: Array containing tissue information.
      - `tissue`: The tissue type, e.g. 'brain_cerebellum'.
      - `value`: The pext score for the tissue in the region.
- `preferred_transcript_id`: Transcript shown on the gene page by default. Field contains MANE Select transcript ID if it exists, otherwise contains Ensembl canonical transcript ID.
- `preferred_transcript_source`: Source of transcript ID used for `preferred_transcript_id` field; either "`mane_select`" or "`ensembl_canonical`".
- `gnomad_constraint`: Struct containing gnomAD constraint information for gene. Struct is only present on the GRCh37 Hail Table.
  - `gene`: Gene name.
  - `transcript`: Transcript ID.
  - `gene_id`: Unique gene ID.
  - `exp_lof`: Expected number of rare (AF <= 0.1%) loss-of-function (LoF) variants.
  - `exp_mis`: Expected number of rare missense variants.
  - `exp_syn`: Expected number of rare synonymous variants.
  - `obs_lof`: Observed number of rare loss-of-function variants.
  - `obs_mis`: Observed number of rare missense variants.
  - `obs_syn`: Observed number of rare synonymous variants.
  - `oe_lof`: Observed/expected (OE) ratio for rare loss-of-function variants.
  - `oe_lof_lower`: Lower bound of ratio for rare loss-of-function variants.
  - `oe_lof_upper`: Upper bound of the OE ratio (LOEUF) for rare loss-of-function variants.
  - `oe_mis`: OE ratio for rare missense variants.
  - `oe_mis_lower`: Lower bound of OE ratio for rare missense variants.
  - `oe_mis_upper`: Upper bound of OE ratio for rare missense variants.
  - `oe_syn`: OE ratio for rare synonymous variants.
  - `oe_syn_lower`: Lower bound of OE ratio for rare synonymous variants.
  - `oe_syn_upper`: Upper bound of the OE ratio for rare synonymous variants.
  - `lof_z`: Z-score for rare loss-of-function variants.
  - `mis_z`: Z-score for rare missense variants.
  - `syn_z`: Z-score for rare synonymous variants.
  - `pli`: Probability of being loss-of-function intolerant (pLI) score.
  - `flags`: Set containing constraint flags for transcript.
- `heterozygous_variant_cooccurrence_counts`: Array containing information about heterozygous variant co-occurrence counts. Struct is only present on GRCh37 Hail Table.
  - `csq`: Variant consequence.
  - `af_cutoff`: Allele frequency cutoff.
  - `data`: Struct containing variant co-occurrence data.
  - `in_cis`: Count of variants in cis.
  - `in_trans`: Count of variants in trans.
  - `unphased`: Count of unphased variants.
  - `two_het_total`: Total count of two heterozygous variants.
- `homozygous_variant_cooccurrence_counts`: Array containing information about homozygous variant co-occurrence counts. Struct is only present on GRCh37 Hail Table.
  - `csq`: Variant consequence.
  - `af_cutoff`: Allele frequency cutoff.
  - `data`: Struct containing variant co-occurrence data.
  - `hom_total`: Total count of homozygous variants.

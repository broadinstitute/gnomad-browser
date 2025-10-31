---
id: clinvar-hts
title: 'ClinVar Hail Tables'
---

### Overview

We release two data tables underlying the ClinVar data displayed in the gnomAD browser. On a bi-monthly basis, we process the ClinVar monthly VCV XML release into two Hail Tables, one for GRCh38 and one for GRCh37. These tables enable our users to more easily incorporate ClinVar data into external pipelines in a manner consistent with what they see in the browser.

These tables are stored in a requester pays GCS bucket. As such, to access or download this data you must provide a billing project when accessing the data with `gsutil`, e.g.

```
gsutil -u YOUR_PROJECT -m cp -r \
  gs://gnomad-browser-clinvar/gnomad_clinvar_grch38.ht \
  gs://YOUR-BUCKET/YOUR-OPTIONAL-NESTED-BUCKETS/gnomad_clinvar_grch38.ht
```

<br />

#### ClinVar GRCh38 Hail Table annotations

Global Fields:

- `clinvar_release_date`: Release date of the ClinVar VCV XML file used to generate this Hail Table.
- `mane_select_version`: MANE Select version used to annotate variants.

Row Fields:

- `locus`: Variant locus. Contains contig and position information.
- `alleles`: Variant alleles.
- `clinvar_variation_id`: Unique ClinVar variant ID.
- `rsid`: dbSNP reference SNP identification (rsID) number.
- `review_status`: ClinVar review status for this variant association.
- `gold_stars`: Number of gold stars assigned to this variant association.
- `clinical_significance`: Clinical significance of this variant association.
- `last_evaluated`: Date when this variant association was last evaluated.
- `submissions`: Array containing all association submissions for this variant.
  - `id`: Unique ID of this variant association submission.
  - `submitter_name`: Group or individual that submitted this variant association submitter.
  - `clinical_significance`: Clinical significance of this variant association submission.
  - `last_evaluated`: Date when this variant association submission was last evaluated.
  - `review_status`: ClinVar review status for this variant association submission.
  - `conditions`: An array containing conditions associated with this variant submission.
    - `name`: Name of the condition.
    - `medgen_id`: MedGen ID of the condition.
- `variant_id`: gnomAD format variant ID.
- `reference_genome`: Reference genome of this variant.
- `chrom`: Chromosome which this variant is in.
- `pos`: Position of this variant in the chromosome.
- `ref`: Reference allele for this variant.
- `alt`: Alternate allele for this variant.
- `transcript_consequences`: Array containing variant transcript consequence information.
  - `biotype`: Transcript biotype.
  - `consequence_terms`: Array of predicted functional consequences.
  - `domains`: Set containing protein domains affected by variant.
  - `gene_id`: Unique ID of gene associated with transcript.
  - `gene_symbol`: Symbol of gene associated with transcript.
  - `hgvsc`: HGVS coding sequence notation for variant.
  - `hgvsp`: HGVS protein notation for variant.
  - `is_canonical`: Whether transcript is the canonical transcript.
  - `lof_filter`: Variant LoF filters (from [LOFTEE](https://github.com/konradjk/loftee)).
  - `lof_flags`: LOFTEE flags.
  - `lof`: Variant LOFTEE status (high confidence `HC` or low confidence `LC`).
  - `major_consequence`: Primary consequence associated with transcript.
  - `transcript_id`: Unique transcript ID.
  - `transcript_version`: Transcript version.
  - `polyphen_prediction`: [Score](https://www.nature.com/articles/nmeth0410-248) that predicts the possible impact of an amino acid substitution on the structure and function of a human protein, ranging from 0.0 (tolerated) to 1.0 (deleterious).
  - `sift_prediction`: [Score](https://www.nature.com/articles/nprot.2009.86) reflecting the scaled probability of the amino acid substitution being tolerated, ranging from 0 to 1. Scores below 0.05 are predicted to impact protein function.
  - `gene_version`: Gene version.
  - `is_mane_select`: Whether transcript is the MANE select transcript.
  - `is_mane_select_version`: MANE Select version; has a value if this transcript is the MANE select transcript.
  - `refseq_id`: RefSeq ID associated with transcript.
  - `refseq_version`: RefSeq version.
- `in_gnomad`: Whether or not this variant is in gnomAD.
- `gnomad`: Struct containing variant information from gnomAD.
  - `exome`: Struct containing exome information from gnomAD for this variant.
    - `filters`: Set containing variant QC filters. See `filters` description on the v4 Hail Tables [help page](v4-hts#filters).
    - `ac`: Allele count for this variant in exomes.
    - `an`: Allele number for this variant in exomes.
  - `genome`: Struct containing genome information from gnomAD for this variant.
    - `filters`: Set containing variant QC filters. See `filters` description on the v4 Hail Tables [help page](v4-hts#filters).
    - `ac`: Allele count for this variant in genomes.
    - `an`: Allele number for this variant in genomes.

<br />

#### ClinVar GRCh37 Hail Table annotations

This table has a nearly identical schema as the ClinVar GRCh38 table, with exceptions noted below, but uses he GRCh37 as its reference genome.

The GRCh37 table does not include these fields:

Global Fields:

- `mane_select_version`

Row Fields:

- Under the `transcript_consequences` array:
  - `is_mane_select`
  - `is_mane_select_version`
  - `refseq_id`
  - `refseq_version`

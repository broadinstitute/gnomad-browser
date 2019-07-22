# Data Format

## Gene results table

The gene results table should have at minimum the following fields:

| Field            | Label                 | Type    | Description                                                       | Example
| ---------------- | --------------------- | ------- | ----------------------------------------------------------------- | ---------------
| gene_id          | Gene ID               | String  | Ensembl gene ID (build GRCh37)                                    | ENSG00000136531
| gene_name        | Gene name             | String  | Ensembl gene name (build GRCh37)                                  | SCN2A
| gene_description | Gene description      | String  | Gene description                                                  | sodium channel, voltage-gated, type II, alpha subunit
| analysis_group   | Analysis group        | String  | Analysis group                                                    | Bipolar I


## Variant annotation table

| Field                   | Label                       | Type   | Description                                                                                                       | Example
| ----------------------- | --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------
| variant_id              | Variant ID                  | String | Variant identifier defined by Chromosome-Position-Ref-Alt                                                         | 16-30980962-C-T
| gene_id                 | Gene ID                     | String | Ensembl gene ID (build GRCh37)                                                                                    | ENSG00000099381
| gene_name               | Gene name                   | String | Ensembl gene name (build GRCh37)                                                                                  | SETD1A
| canonical_transcript_id | Transcript ID (canonical)   | String | Canonical ensembl transcript ID (build GRCh37)                                                                    | ENST00000262519
| transcript_id           | Transcript ID(s)            | String | Ensembl transcript ID(s) (build GRCh37)                                                                           | ENST00000262519
| hgvsc_canonical         | HGVSc (canonical)           | String | HGVS coding sequencing name for canonical transcript                                                              | c.2968C>T
| hgvsc                   | HGVSc                       | String | HGVS coding sequencing name                                                                                       | c.2968C>T
| hgvsp_canonical         | HGVSp (canonical)           | String | HGVS protein sequence name for the canonical transcript                                                           | p.Arg990Ter
| hgvsp                   | HGVSp                       | String | HGVS protein sequence name                                                                                        | p.Arg990Ter
| csq_analysis            | Consequence (for analysis)  | String | Consequence used for analysis                                                                                     | lof
| csq_canonical           | Consequence (canonical)     | String | The consequence on the canonical transcript according to the VEP tool                                             | stop gained
| csq_worst               | Consequence (worst)         | String | The worst consequence according to the VEP tool                                                                   | stop gained
| cadd                    | CADD                        | Float  | CADD PHRED score                                                                                                  | 30.53
| mpc                     | MPC                         | Float  | MPC score defined in Samocha et al                                                                                | 0.56
| polyphen                | PolyPhen                    | String | PolyPhen-2 annotation for missense variants (probably damaging, possibly damaging, benign)                        | D


## Variant results table

The variant results table should have at minimum the following fields:

| Field             | Label              | Type    | Description                                                        | Example
| ----------------- | ------------------ | ------- | ------------------------------------------------------------------ | ---------------
| variant_id        | Variant ID         | String  | Variant ID as Chromosome-Position-Ref-Alt                          | 16-30980962-C-T
| analysis_group    | Analysis group     | String  | Analysis group used in single variant association analyses         | EUR
| ac_case           | AC case            | Integer | Allele count in cases in this group                                | 1
| an_case           | AN case            | Integer | Allele number in cases in this group                               | 48690
| af_case           | AF case            | Float   | Allele frequency in cases in this group                            | 2.05389E-5
| ac_ctrl           | AC control         | Integer | Allele count in controls in this group                             | 0
| an_ctrl           | AN control         | Integer | Allele number in controls in this group                            | 99714
| af_ctrl           | AF control         | Float   | Allele frequency in controls in this group                         | 0

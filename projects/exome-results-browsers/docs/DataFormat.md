# Data Format

## Gene results table

| Field           | Label                 | Type    | Description                                                       | Example
| --------------- | --------------------- | ------- | ----------------------------------------------------------------- | ---------------
| gene_id         | Gene ID               | String  | Ensembl gene ID (build GRCh37)                                    | ENSG00000136531
| gene_name       | Gene name             | String  | Ensembl gene name (build GRCh37)                                  | SCN2A
| description     | Gene description      | String  | Gene description                                                  | sodium channel, voltage-gated, type II, alpha subunit
| analysis_group  | Analysis group        | String  | Analysis group                                                    | Bipolar I
| xcase_{}        | Case count {}         | Integer | Number of case variants in the corresponding variant category     | 5
| xctrl_{}        | Control count {}      | Integer | Number of control variants in the corresponding variant category  | 1
| pval_{}         | P-value for {}        | Float   | P-value for corresponding variant category                        | 0.005
| pval            | P-value               | Float   | P-value                                                           | 0.0001

The gene results table can contain case/control/p-val values for an arbitrary number of variant categories.
For example, fields for results with LoF and Missense categories should look like:
```
gene_id,analysis_group,gene_name,description,xcase_LoF,xctrl_LoF,pval_LoF,xcase_Missense,xctrl_Missense,pval_Missense,pval
```


## Variant annotation table

| Field                   | Label                       | Type   | Description                                                                                                       | Example
| ----------------------- | --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------
| v                       | Variant ID                  | String | Variant identifier defined by Chromosome-Position-Ref-Alt                                                         | 16-30980962-C-T
| source                  | Source                      | String | Flag indicating if variant was identified in SCHEMA exomes, WGSPD genomes, gnomAD exomes, and/or gnomAD genomes   | E/G/gE/gG
| flags                   | Flags                       | String | Indicates if variant passed or failed in each call set, and the random forest probability this variant is real    | PASS
| in_analysis             | In analysis                 | Bool   | Flag indicating if variant was included in the gene burden test statistic based on predefined critieria           | True
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
| comment                 | Comment                     | String | Additional metadata and comments regarding this variant                                                           | Failed random forest


## Variant results table

| Field             | Label              | Type    | Description                                                        | Example
| ----------------- | ------------------ | ------- | ------------------------------------------------------------------ | ---------------
| v                 | Variant ID         | String  | Variant ID as Chromosome-Position-Ref-Alt                          | 16-30980962-C-T
| analysis_group    | Analysis group     | String  | Analysis group used in single variant association analyses         | EUR
| ac_case           | AC case            | Integer | Allele count in cases in this group                                | 1
| an_case           | AN case            | Integer | Allele number in cases in this group                               | 48690
| af_case           | AF case            | Float   | Allele frequency in cases in this group                            | 2.05389E-5
| ac_ctrl           | AC control         | Integer | Allele count in controls in this group                             | 0
| an_ctrl           | AN control         | Integer | Allele number in controls in this group                            | 99714
| af_ctrl           | AF control         | Float   | Allele frequency in controls in this group                         | 0
| n_denovos         | N denovos          | Integer | Number of genotypes in this group determined to de novo in origin  | 0
| p                 | P-value            | Float   | P-value from single variant association testing                    | 0.32
| est               | Estimate           | Float   | Effect size from single variant association testing                | 1.03
| se                | SE                 | Float   | Standard error from single variant association testing             | 0.32
| qp                | Qp                 | Float   | P-value from heterogeneity test                                    | 0.8
| i2                | I2                 | Float   | I2 from heterogeneity test                                         | 0.53

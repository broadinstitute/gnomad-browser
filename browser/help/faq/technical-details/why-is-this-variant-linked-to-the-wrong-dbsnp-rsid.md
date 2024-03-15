---
question: 'Why is this variant linked to the wrong dbSNP rsID?'
---

First, we do not continuously update the dbSNP rsIDs displayed in the browser, so there will be some differences between the databases and dbSNP depending on versions being used. The dbSNP version used are:

- gnomAD v4.1: dbSNP version 156
- gnomAD v4.0: dbSNP version 156
- gnomAD v3.1: dbSNP version 154
- gnomAD v3: dbSNP version 151
- gnomAD v2: dbSNP version 147
- ExAC: dbSNP version 141

Several other classes of problems relate to fundamental issues with dbSNP such as the fact that dbSNP IDs define a locus, not a variant, and therefore multiple variants map to the same dbSNP ID. We generally suggest not using these identifiers at all; if a user is interested in a particular variant we encourage searching for it by chromosome, position, and allele rather than rsID.

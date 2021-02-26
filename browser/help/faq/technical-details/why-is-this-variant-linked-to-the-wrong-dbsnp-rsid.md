---
question: 'Why is this variant linked to the wrong dbSNP rsID?'
---

First, we do not continuously update the dbSNP rsIDs displayed in the browser, so there will be some differences the databases and dbSNP depending on versions been used. The dbSNP version used are:

- ExAC: dbSNP version 141
- gnomAD v2: dbSNP version 147
- gnomAD v3: dbSNP version 151
- gnomAD v3.1: dbSNP version 154

Several other classes of problem relates to fundamental issues with dbSNP. We generally suggest not using these identifiers at all; if a user is interested in a particular variant we encourage searching for it by chromosome, position, and allele rather than rsID.

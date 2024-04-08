---
question: 'Do the cancer samples in the database include tumor exomes, or is this from germline samples only?'
---

Version 4.1 of gnomAD does not contain samples that were specifically recruited for cancer. Although v2 included TCGA samples, these were removed from v4 during sample QC due to data quality issues. It should be noted that we do not collect detailed phenotypes for all individuals and thus do not know if any individuals in gnomAD have a personal or family history of cancer.
All of the "cancer" samples in ExAC and v2 are blood ("germline") samples from TCGA. We excluded any sample labeled as tumor. In addition, it is possible that in some patients the blood samples are contaminated by circulating tumor cells.

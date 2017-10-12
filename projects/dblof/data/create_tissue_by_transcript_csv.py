import re
import pandas as pd

TRANSCRIPT_TPM = '/Users/msolomon/Data/gtex/reheadered.031216.GTEx_Analysis_2016-09-07_RSEMv1.2.22_transcript_tpm.txt.gz'

def format_header(tissues_grouped_medians):
    match = re.compile(r"[-\(\)_]")
    tissue_names_camel = []
    for tissue_name in tissues_grouped_medians.columns:
        words = match.split(tissue_name)
        camel = []
        for i, word in enumerate(words):
            if i == 0:
                camel.append(word[0].lower() + word[1:])
            else:
                camel.append(word.capitalize())
        tissue_names_camel.append("".join(camel))
    return tissue_names_camel

def write_csv(filepath):
    with open(filepath, 'r') as src:
        df = pd.read_csv(src, compression='gzip', sep='\t', chunksize=1000)
        for i, transcript_tpm_df in enumerate(df):
            tissues = transcript_tpm_df.drop(['transcript_id', 'gene_id'], axis=1)
            tissues_grouped_medians = tissues.groupby(tissues.columns.str.split(".").str[0], axis=1).median()
            ids = transcript_tpm_df[['transcript_id', 'gene_id']]
            tissues_grouped_medians['transcript_id'] = ids['transcript_id'].apply(lambda x: x.split('.')[0])
            tissues_grouped_medians['gene_id'] = ids['gene_id'].apply(lambda x: x.split('.')[0])
            tissues_grouped_medians_rename_col = tissues_grouped_medians

            if i == 0:
                tissue_names_camel = format_header(tissues_grouped_medians)
                tissues_grouped_medians_rename_col.columns = tissue_names_camel
                tissues_grouped_medians_rename_col.to_csv('./gtex_tissues_by_transcript_all.csv')
            else:
                tissues_grouped_medians_rename_col.to_csv('./gtex_tissues_by_transcript_all.csv', mode='a', header=None)

write_csv(TRANSCRIPT_TPM)

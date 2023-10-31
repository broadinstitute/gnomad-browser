"""
#!/usr/bin/env bash

echo '

Downloaded Gencode table from

https://genome.ucsc.edu/cgi-bin/hgTables?hgsid=1709311258_RWei0gkOE2tyHEFUmtIntPj8fRTi&clade=mammal&org=Human&db=hg38&hgta_group=genes&hgta_track=wgEncodeGencodeV39&hgta_table=0&hgta_regionType=genome&position=chr2%3A25%2C160%2C915-25%2C168%2C903&hgta_outputType=primaryTable&hgta_outFileName=knownGene.v39.hg38.txt.gz

by selecting

Assembly: Dec. 2013 (GRCh38/hg38)
Group: Genes and Gene Predictions
Track: All GENCODE V39
Table: Basic (wgEncodeGencodeBasicV39)
Region: genome
Output format: all fields from selected table
Output filename: gencode.v39.hg38.txt
Output field separator: tsv


Example row:
$1           #bin : 1
$2           name : ENST00000337907.7
$3          chrom : chr1
$4         strand : -
$5        txStart : 8352396
$6          txEnd : 8817465
$7       cdsStart : 8355086
$8         cdsEnd : 8656297
$9      exonCount : 24
$10    exonStarts : 8352396,8355418,8356099,8358195,8359763,8360111,8361762,8362682,8364055,8364745,8365811,8422726,8465924,8495062,8497404,8508626,8541213,8556474,8557417,8614560,8624309,8655972,8792403,8817159,
$11      exonEnds : 8355120,8355599,8356246,8358916,8359986,8361490,8361876,8362844,8364255,8364838,8365974,8422807,8466023,8495162,8497529,8508675,8541318,8556571,8557523,8614686,8624380,8656441,8792588,8817465,
$12         score : 0
$13         name2 : RERE
$14  cdsStartStat : cmpl
$15    cdsEndStat : cmpl
$16    exonFrames : 2,1,1,0,2,0,0,0,1,1,0,0,0,2,0,2,2,1,0,0,1,0,-1,-1,
"""

# %%
import os
import pandas as pd

gencode_version = "v39"
for input_path, genome_dir in [
    (f"gencode.{gencode_version}.hg38.txt", "GRCh38"),
]:
    print(f"Reading {input_path}")
    df = pd.read_table(input_path)
    df = df.sort_values(["chrom", "txStart", "txEnd"])
    filter_exp = (df["txStart"] > 0) & (df["txEnd"] > 0)
    df2 = df[filter_exp]
    if len(df) - len(df2) > 0:
        print(f"Filtered out {len(df) - len(df2)} records from {input_path}:")
        print(df[~filter_exp])

    output_path = input_path.replace(".txt", ".sorted.txt")
    df2.to_csv(output_path, header=False, index=False, sep="\t")
    print("Done")
    os.system(f"bgzip -f {output_path}")
    os.system(f"tabix -s 3 -b 5 -e 6 -f {output_path}.gz")


# %%

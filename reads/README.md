# gnomAD Read Data

Data for the "Read Data" visualizations on the gnomAD browser's variant page.

The individual read visualizations are based on "mini-BAMs" containing data for a small window around a variant.
The code for generating the "mini-BAMs" is located in the [broadinstitute/gnomad-readviz](https://github.com/broadinstitute/gnomad-readviz) repository.

Tracks containing the reference sequence and transcripts (based on Gencode data) are also shown.

## Reference data

### Transcripts

The read data component uses a BED format [annotation track](https://github.com/igvteam/igv.js/wiki/Annotation-Track)
to display transcripts.

To convert a Gencode GTF file to BED format, use the `gtf2bed.py` script. An index file is also needed to avoid loading
the entire BED file in the browser. 

```
python ./reference-data/gtf2bed.py /path/to/gencode.gtf /path/to/gencode.bed.bgz
tabix -p bed /path/to/gencode.bed.bgz
```

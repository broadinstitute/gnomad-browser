# gnomAD Read Data

Data for the "Read Data" visualizations on the gnomAD browser's variant page.

The individual read visualizations are based on "mini-BAMs" containing data for a small window around a variant.
The code for generating the "mini-BAMs" is located in the [broadinstitute/gnomad-readviz](https://github.com/broadinstitute/gnomad-readviz) repository.

Tracks containing the reference sequence and transcripts (based on GENCODE data) are also shown.

## Reference data

### Reference sequence

The following files are used for the reference sequence:

- GRCh37: `gs://gcp-public-data--broad-references/hg19/v0/Homo_sapiens_assembly19.fasta`
- GRCh38: `gs://gcp-public-data--broad-references/hg38/v0/Homo_sapiens_assembly38.fasta`

### Transcripts

The read data component uses a BED format [annotation track](https://github.com/igvteam/igv.js/wiki/Annotation-Track)
to display transcripts.

To convert a GENCODE GTF file to BED format, use the `gtf2bed.py` script. An index file is also needed to avoid loading
the entire BED file in the browser.

```
python ./reference-data/gtf2bed.py /path/to/gencode.gtf /path/to/gencode.bed.bgz
tabix -p bed /path/to/gencode.bed.bgz
```

## Adding reads for a dataset

- [Create a snapshot](https://cloud.google.com/compute/docs/disks/create-snapshots) of the current reads disk]

- [Create a new disk from the snapshot](https://cloud.google.com/compute/docs/disks/restore-and-delete-snapshots).
  The new disk should be large enough to contain the existing data and the new reads.

- Create a compute instance and attach the new disk.

  ```
  gcloud compute instances create <instance-name> --zone <zone>

  gcloud compute instances attach-disk <instance-name> \
    --disk <new-disk-name> \
    --device-name reads-disk \
    --zone <zone>
  ```

- SSH into the compute instance and resize the disk's filesystem to match its size.
  https://cloud.google.com/compute/docs/disks/add-persistent-disk#resize_partitions

  ```
  sudo resize2fs /dev/disk/by-id/reads-disk
  ```

- [Mount the disk](https://cloud.google.com/compute/docs/disks/add-persistent-disk#formatting).

  ```
  sudo mkdir -p /mnt/disks/reads
  sudo mount -o discard,defaults /dev/disk/by-id/google-reads-disk /mnt/disks/reads
  ```

- Copy reads onto the new disk.

  ```
  gsutil -m cp -r gs://bucket/path/to/reads /mnt/disks/reads
  ```

- Unmount the disk and delete the instance.

  ```
  sudo umount /mnt/disks/reads
  ```

  ```
  gcloud compute instances detach-disk <instance-name> \
    --disk <new-disk-name> \
    --zone <zone>

  gcloud compute instances delete <instance-name>
  ```

- Add volume configuration to [reads deployment](../deploy/manifests/reads/base/reads.deployment.yaml)

- Add location directives to [nginx configuration](../deploy/dockerfiles/reads/reads-base.nginx.conf).

- Update API environment variables in [reads deployment](../deploy/manifests/reads/base/reads.deployment.yaml).

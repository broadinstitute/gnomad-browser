#!/bin/sh -eu

# Specific steps for updating disk for gnomAD v4 reads

curl -o gencode.v39.annotation.gtf.gz ftp://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_39/gencode.v39.annotation.gtf.gz

gunzip gencode.v39.annotation.gtf.gz

python gtf2bed.py gencode.v39.annotation.gtf gencode.v39.annotation.bed.bgz

/Users/msolomon/.local/bin/htslib/bin/tabix gencode.v39.annotation.bed.bgz

gcloud compute instances create v4-readviz-update \
	--machine-type e2-standard-8 \
	--zone us-east1-c

# BW said new reads ~700GB
gcloud compute disks create readviz-data-v4-2023-10-28 \
	--size=6550GB \
	--source-snapshot=readviz-data-2023-10-28-snapshot \
	--type=pd-balanced \
	--zone us-east1-c

gcloud compute instances attach-disk v4-readviz-update \
	--disk readviz-data-v4-2023-10-28 \
	--device-name reads-disk \
	--zone us-east1-c

# - SSH into the compute instance.

sudo mkdir -p /mnt/disks/reads

sudo mount -o discard,defaults /dev/disk/by-id/google-reads-disk /mnt/disks/reads

sudo resize2fs /dev/disk/by-id/google-reads-disk

# On my machine, copy gencode files to VM

gcloud compute scp gencode.v39.annotation.bed.bgz v4-readviz-update:~/

gcloud compute scp gencode.v39.annotation.bed.bgz.tbi v4-readviz-update:~/

# On VM, move them to reference folder
sudo mv ~/gencode* /mnt/disks/reads/reference/

# on VM, make new dataset directory copy mini bams + dbs
sudo mkdir /mnt/disks/reads/datasets/gnomad_r4

gsutil -m cp -r "gs://gnomad-readviz/v4.0/combined_deidentified_bamout/all*db" /mnt/disks/reads/datasets/gnomad_r4/

gsutil -m cp -r "gs://gnomad-readviz/v4.0/combined_deidentified_bamout/*.ba*" /mnt/disks/reads/datasets/gnomad_r4/

# Clean up

sudo umount /mnt/disks/reads

gcloud compute instances detach-disk v4-readviz-update \
	--disk readviz-data-v4-2023-10-28 \
	--zone us-east1-c

gcloud compute instances delete v4-readviz-update --zone us-east1-c

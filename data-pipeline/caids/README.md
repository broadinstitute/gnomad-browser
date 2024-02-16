# ClinGen Canonical Allele IDs for gnomAD

1. Export gnomAD variants to sharded VCFs.

   ```
   hailctl dataproc start my-cluster

   hailctl dataproc submit my-cluster export_vcfs.py "gnomAD v4.0" gs://my-bucket/path/to/gnomad_v4.vcf.gz
   hailctl dataproc submit my-cluster export_vcfs.py "gnomAD v3.1.1" gs://my-bucket/path/to/gnomad_v3.vcf.gz
   hailctl dataproc submit my-cluster export_vcfs.py "gnomAD v2.1.1" gs://my-bucket/path/to/gnomad_v2.vcf.gz
   hailctl dataproc submit my-cluster export_vcfs.py "ExAC" gs://my-bucket/path/to/exac.vcf.gz

   hailctl dataproc stop my-cluster
   ```

2. Create and configure a Compute Engine instance.

   This instance should have a service account and scopes that allow writing to GCS.

   ```
   gcloud compute instances create my-instance \
      --machine-type=e2-standard-2 \
      --scopes=default,storage-rw \
      --subnet=my-subnet
   ```

   -  Connect to the instance.

      ```
      gcloud compute ssh my-instance
      ```

   -  Install Hail

      ```
      sudo apt-get install -y python3-pip

      python3 -m pip install hail
      ```

   -  Install [Screen](https://www.gnu.org/software/screen/).

      ```
      sudo apt-get install -y screen
      ```

3. Fetch CAIDs from ClinGen Allele Registry.

   -  Start a Screen session.

      ```
      screen
      ```

   -  Run `get_caids.py`.

      ```
      python get_caids.py gs://my-bucket/path/to/gnomad.vcf.gz gs://my-bucket/path/to/output
      ```

   -  Detach from the screen session (`Ctrl-a d`) and disconnect.

   -  To check on progress, reconnect to the instance / screen session.

      ```
      gcloud compute ssh my-instance
      screen -r
      ```

4. Import CAIDs into a Hail Table.

   ```
   hailctl dataproc start my-cluster

   hailctl dataproc submit my-cluster import_caids.py gs://my-bucket/path/to/output gs://my-bucket/path/to/table.ht --reference-genome=GRCh38

   hailctl dataproc stop my-cluster
   ```

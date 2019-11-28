# Setup

Scripts to configure a GCP environment for the gnomAD browser.

1. Add configuration.

   ```
   cat > cluster/.env <<EOF
   PROJECT=
   REGION=
   ZONE=

   AUTHORIZED_NETWORKS=("0.0.0.0/0")
   EOF
   ```

   Fill in values for your environment.

2. Run setup scripts.

   1. enable_apis.sh
   2. create_network.sh
   3. create_cluster_service_account.sh
   4. create_cluster.sh
   5. create_firewall_rules.sh

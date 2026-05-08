#!/bin/bash
set -e

apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release redis-server python3 python3-pip python3-venv git jq

# --- Redis Setup ---
sed -i 's/bind 127.0.0.1 -::1/bind 0.0.0.0/' /etc/redis/redis.conf
sed -i 's/protected-mode yes/protected-mode no/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# --- Data Disk Setup ---
DATA_DISK="/dev/sdb"
MOUNT_POINT="/data"
if ! blkid $DATA_DISK | grep -q ext4; then
    mkfs.ext4 -F $DATA_DISK
fi
mkdir -p $MOUNT_POINT
mount $DATA_DISK $MOUNT_POINT
if ! grep -q "$MOUNT_POINT" /etc/fstab; then
    echo "$DATA_DISK $MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
fi

# --- ClickHouse Setup ---
mkdir -p $MOUNT_POINT/clickhouse
chown -R root:root $MOUNT_POINT/clickhouse

curl -fsSL https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" > /etc/apt/sources.list.d/clickhouse.list

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client

cat > /etc/clickhouse-server/config.d/data-paths.xml << 'EOF'
<clickhouse>
    <path>/data/clickhouse/</path>
    <tmp_path>/data/clickhouse/tmp/</tmp_path>
    <user_files_path>/data/clickhouse/user_files/</user_files_path>
    <format_schema_path>/data/clickhouse/format_schemas/</format_schema_path>
</clickhouse>
EOF

cat > /etc/clickhouse-server/config.d/listen.xml << 'EOF'
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
</clickhouse>
EOF

chown -R clickhouse:clickhouse $MOUNT_POINT/clickhouse
systemctl enable clickhouse-server
systemctl start clickhouse-server

# --- Prepare Repo for Data Loading ---
cd /opt
if [ ! -d "gnomad-browser" ]; then
    git clone https://github.com/broadinstitute/gnomad-browser.git
    chown -R root:root gnomad-browser
fi

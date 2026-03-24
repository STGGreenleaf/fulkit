#!/bin/bash
# Fabric Signal Pipeline — VPS Setup Script
# Run on a fresh Ubuntu 24.04 droplet ($12/mo, 2GB RAM)
#
# Usage: ssh root@your-droplet 'bash -s' < setup-vps.sh

set -e

echo "=== Fabric Signal Pipeline Setup ==="

# System deps
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv ffmpeg

# yt-dlp (latest from GitHub, not apt — apt version is often stale)
pip3 install --break-system-packages yt-dlp

# Project directory
mkdir -p /opt/fabric
cd /opt/fabric

# Python venv
python3 -m venv venv
source venv/bin/activate
pip install numpy scipy supabase

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Copy fabric-worker.py to /opt/fabric/"
echo "2. Create /opt/fabric/.env with:"
echo "   SUPABASE_URL=https://your-project.supabase.co"
echo "   SUPABASE_SERVICE_KEY=your-service-role-key"
echo "3. Test: cd /opt/fabric && source venv/bin/activate && python3 fabric-worker.py"
echo "4. Daemonize: create a systemd service (see below)"
echo ""
echo "Systemd service file (/etc/systemd/system/fabric-worker.service):"
echo "  [Unit]"
echo "  Description=Fabric Signal Pipeline Worker"
echo "  After=network.target"
echo "  [Service]"
echo "  Type=simple"
echo "  WorkingDirectory=/opt/fabric"
echo "  ExecStart=/opt/fabric/venv/bin/python3 /opt/fabric/fabric-worker.py"
echo "  EnvironmentFile=/opt/fabric/.env"
echo "  Restart=always"
echo "  RestartSec=10"
echo "  [Install]"
echo "  WantedBy=multi-user.target"
echo ""
echo "Then: systemctl enable fabric-worker && systemctl start fabric-worker"

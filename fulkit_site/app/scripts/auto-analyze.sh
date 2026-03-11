#!/bin/bash
# Fabric Auto-Analyzer — runs via launchd every 5 min
# Processes up to 50 pending tracks per run
export PATH="/Users/greenleafhome/.local/share/fnm/node-versions/v24.11.0/installation/bin:$PATH"
cd "$(dirname "$0")/.."
node scripts/batch-analyze.mjs --limit 50 --delay 2 >> /tmp/fabric-analyze.log 2>&1

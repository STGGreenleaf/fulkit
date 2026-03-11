#!/bin/bash
# Fabric Auto-Analyzer — runs via launchd every 5 min
# Processes up to 10 pending tracks per run
cd "$(dirname "$0")/.."
node scripts/batch-analyze.mjs --limit 50 --delay 2 >> /tmp/fabric-analyze.log 2>&1

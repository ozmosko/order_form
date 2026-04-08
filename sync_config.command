#!/bin/bash
cd "$(dirname "$0")"
cp deploy/config.js admin/config.js
echo "✓ config.js synced from deploy/ to admin/"

#!/bin/bash
#
# Symlink the Brain health plugin into the user's SwiftBar plugin folder.
#
# Assumes the default plugin folder is ~/Documents/SwiftBar as suggested
# in README.md. If you picked a different folder, set SWIFTBAR_PLUGIN_DIR
# before running, e.g.:
#
#   SWIFTBAR_PLUGIN_DIR=~/SwiftBar bash scripts/swiftbar/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/brain-health.30s.sh"
PLUGIN_DIR="${SWIFTBAR_PLUGIN_DIR:-$HOME/Documents/SwiftBar}"
PLUGIN_DST="$PLUGIN_DIR/brain-health.30s.sh"

if [ ! -f "$PLUGIN_SRC" ]; then
  echo "error: plugin script not found at $PLUGIN_SRC" >&2
  exit 1
fi

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "SwiftBar plugin folder $PLUGIN_DIR does not exist."
  echo "Create it and tell SwiftBar to use it (Preferences → Plugin Folder), then re-run."
  exit 1
fi

# Ensure the source is executable.
chmod +x "$PLUGIN_SRC"

# If a symlink already points to our script, we're done.
if [ -L "$PLUGIN_DST" ] && [ "$(readlink "$PLUGIN_DST")" = "$PLUGIN_SRC" ]; then
  echo "Already installed: $PLUGIN_DST → $PLUGIN_SRC"
  exit 0
fi

# If something else is there, back it up before overwriting.
if [ -e "$PLUGIN_DST" ] || [ -L "$PLUGIN_DST" ]; then
  BACKUP="$PLUGIN_DST.bak.$(date +%s)"
  mv "$PLUGIN_DST" "$BACKUP"
  echo "Moved existing $PLUGIN_DST → $BACKUP"
fi

ln -s "$PLUGIN_SRC" "$PLUGIN_DST"
echo "Installed: $PLUGIN_DST → $PLUGIN_SRC"
echo
echo "Next steps:"
echo "  1. Make sure SwiftBar is running (Applications → SwiftBar)."
echo "  2. In SwiftBar's menu: 'Refresh all' — the 🟢/🔴 Brain icon should appear."
echo "  3. SwiftBar → Preferences → check 'Launch at Login' so it survives reboots."

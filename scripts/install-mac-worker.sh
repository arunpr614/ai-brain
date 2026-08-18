#!/usr/bin/env bash
# ==============================================================================
# install-mac-worker.sh
# Automated installer and lifecycle manager for Mac M5 Pro Local ASR Daemon.
# ==============================================================================
set -euo pipefail

LABEL="com.arunprakash.brain.macworker"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/ai-brain"
VENV_DIR="$HOME/.brain-worker-venv"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_SCRIPT="$REPO_DIR/src/mac_worker.py"
PLIST_TEMPLATE="$SCRIPT_DIR/com.arunprakash.brain.macworker.plist.template"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

check_apple_silicon() {
    if [[ "$(uname)" != "Darwin" ]]; then
        log_err "This worker is designed for macOS (Apple Silicon). Detected: $(uname)"
        exit 1
    fi
    local arch
    arch="$(uname -m)"
    if [[ "$arch" != "arm64" ]]; then
        log_warn "Architecture is $arch (expected arm64 for Apple Silicon Metal GPU acceleration)."
    else
        log_ok "Apple Silicon hardware detected: $arch"
    fi
}

setup_venv() {
    log_info "Setting up Python virtual environment at $VENV_DIR..."
    if [[ ! -d "$VENV_DIR" ]]; then
        python3 -m venv "$VENV_DIR"
        log_ok "Created virtualenv."
    fi

    log_info "Installing / updating required Python packages (mlx-whisper, av, yt-dlp, numpy, requests, psutil)..."
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    "$VENV_DIR/bin/pip" install --quiet mlx-whisper av yt-dlp numpy requests psutil
    log_ok "Python dependencies installed successfully."
}

install_daemon() {
    check_apple_silicon
    setup_venv

    mkdir -p "$HOME/Library/LaunchAgents"
    mkdir -p "$LOG_DIR"

    local server_url="${BRAIN_SERVER_URL:-http://127.0.0.1:3000}"
    local worker_token="${BRAIN_WORKER_TOKEN:-${BRAIN_API_TOKEN:-}}"
    local worker_id="${WORKER_ID:-mac-m5-pro}"
    local whisper_model="${WHISPER_MODEL:-mlx-community/whisper-large-v3-turbo}"
    local poll_interval="${POLL_INTERVAL_SECONDS:-5.0}"

    if [[ -z "$worker_token" ]]; then
        log_warn "BRAIN_WORKER_TOKEN is not currently exported in your environment."
        log_warn "You can export BRAIN_WORKER_TOKEN=... or edit ~/.zshrc."
    fi

    log_info "Generating launchd plist at $PLIST_PATH..."
    sed \
        -e "s|__VENV_PYTHON__|$VENV_DIR/bin/python3|g" \
        -e "s|__WORKER_SCRIPT__|$WORKER_SCRIPT|g" \
        -e "s|__BRAIN_SERVER_URL__|$server_url|g" \
        -e "s|__BRAIN_WORKER_TOKEN__|$worker_token|g" \
        -e "s|__WORKER_ID__|$worker_id|g" \
        -e "s|__WHISPER_MODEL__|$whisper_model|g" \
        -e "s|__POLL_INTERVAL_SECONDS__|$poll_interval|g" \
        -e "s|__LOG_DIR__|$LOG_DIR|g" \
        "$PLIST_TEMPLATE" > "$PLIST_PATH"

    chmod 644 "$PLIST_PATH"
    log_ok "Plist generated."

    # Unload previous instance if present
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST_PATH" 2>/dev/null || true

    # Bootstrap service
    if launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null; then
        log_ok "Service bootstrapped via launchctl bootstrap."
    else
        launchctl load "$PLIST_PATH"
        log_ok "Service loaded via launchctl load."
    fi

    log_ok "Mac Local ASR Worker Daemon installed and active!"
    log_info "Logs: $LOG_DIR/mac_worker.out.log"
}

start_daemon() {
    log_info "Starting daemon $LABEL..."
    launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl start "$LABEL" || true
    log_ok "Start command issued."
}

stop_daemon() {
    log_info "Stopping daemon $LABEL..."
    launchctl kill SIGTERM "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl stop "$LABEL" || true
    log_ok "Stop command issued."
}

status_daemon() {
    log_info "Checking daemon status for $LABEL..."
    if launchctl list | grep -q "$LABEL"; then
        log_ok "Daemon is LOADED in launchd:"
        launchctl list | grep "$LABEL"
    else
        log_warn "Daemon $LABEL is NOT loaded in launchd."
    fi

    if [[ -f "$LOG_DIR/mac_worker.out.log" ]]; then
        echo "--- Latest Output Log Tail ---"
        tail -n 10 "$LOG_DIR/mac_worker.out.log"
    fi
}

logs_daemon() {
    log_info "Tailing daemon logs from $LOG_DIR..."
    tail -f "$LOG_DIR/mac_worker.out.log" "$LOG_DIR/mac_worker.err.log"
}

uninstall_daemon() {
    log_info "Uninstalling daemon $LABEL..."
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST_PATH" 2>/dev/null || true
    rm -f "$PLIST_PATH"
    log_ok "Removed launchd plist."
    log_ok "Daemon uninstalled."
}

usage() {
    echo "Usage: $0 {install|start|stop|restart|status|logs|uninstall}"
    exit 1
}

case "${1:-install}" in
    install)
        install_daemon
        ;;
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        stop_daemon
        sleep 1
        start_daemon
        ;;
    status)
        status_daemon
        ;;
    logs)
        logs_daemon
        ;;
    uninstall)
        uninstall_daemon
        ;;
    *)
        usage
        ;;
esac

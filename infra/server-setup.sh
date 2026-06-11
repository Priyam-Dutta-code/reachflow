#!/usr/bin/env bash
# server-setup.sh — idempotent hardening + Docker install for the ReachFlow VM.
#
# Target: Ubuntu 24.04 (Minimal) aarch64 on Oracle Cloud Always Free.
# Usage:  sudo bash infra/server-setup.sh        (safe to re-run any time)
#
# What it does:
#   1. Creates a non-root sudo user (default: reachflow) with your SSH key
#   2. SSH: key-only auth, root login disabled, password auth disabled
#   3. Firewall: ufw default-deny, allow 22/tcp ONLY (web traffic arrives via
#      the outbound Cloudflare Tunnel — no open 80/443 by design).
#      Handles Oracle images' pre-seeded iptables REJECT rules.
#   4. fail2ban (sshd jail), unattended-upgrades
#   5. Docker Engine + compose plugin (official apt repo, arm64-aware)
#   6. Docker log rotation (json-file, 10m × 3)
#   7. Timezone Asia/Kolkata
#
# Override defaults via env: NEW_USER, TIMEZONE, SSH_PORT.

set -euo pipefail

NEW_USER="${NEW_USER:-reachflow}"
TIMEZONE="${TIMEZONE:-Asia/Kolkata}"
SSH_PORT="${SSH_PORT:-22}"

log()  { echo -e "\033[1;32m[setup]\033[0m $*"; }
warn() { echo -e "\033[1;33m[setup]\033[0m $*"; }

[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash $0" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive

# ── 0. Base packages ─────────────────────────────────────────────────
log "apt update + base packages"
apt-get update -q
apt-get install -yq ca-certificates curl gnupg ufw fail2ban \
  unattended-upgrades apt-listchanges git logrotate

# ── 1. Non-root sudo user with SSH key ──────────────────────────────
if id "$NEW_USER" &>/dev/null; then
  log "user '$NEW_USER' already exists"
else
  log "creating user '$NEW_USER'"
  adduser --disabled-password --gecos "" "$NEW_USER"
fi
usermod -aG sudo "$NEW_USER"

# passwordless sudo (no password exists; password auth is disabled anyway)
echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$NEW_USER"
chmod 440 "/etc/sudoers.d/90-$NEW_USER"

# copy authorized_keys from whoever bootstrapped the box (ubuntu/root)
USER_SSH_DIR="/home/$NEW_USER/.ssh"
mkdir -p "$USER_SSH_DIR"
if [[ ! -s "$USER_SSH_DIR/authorized_keys" ]]; then
  for src in /home/ubuntu/.ssh/authorized_keys /root/.ssh/authorized_keys; do
    if [[ -s "$src" ]]; then
      cp "$src" "$USER_SSH_DIR/authorized_keys"
      log "copied authorized_keys from $src"
      break
    fi
  done
fi
[[ -s "$USER_SSH_DIR/authorized_keys" ]] || warn "no authorized_keys found — add one before logging out!"
chown -R "$NEW_USER:$NEW_USER" "$USER_SSH_DIR"
chmod 700 "$USER_SSH_DIR"
chmod 600 "$USER_SSH_DIR/authorized_keys" 2>/dev/null || true

# ── 2. SSH hardening (drop-in, doesn't fight cloud-init) ────────────
log "hardening sshd"
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-reachflow-hardening.conf <<EOF
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 4
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
# Oracle images sometimes ship a cloud-init drop-in re-enabling password auth
if grep -rqs "PasswordAuthentication yes" /etc/ssh/sshd_config.d/ --include='*.conf' -l; then
  for f in $(grep -rls "PasswordAuthentication yes" /etc/ssh/sshd_config.d/); do
    [[ "$f" == *99-reachflow* ]] && continue
    sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' "$f"
    log "fixed PasswordAuthentication in $f"
  done
fi
sshd -t && systemctl reload ssh

# ── 3. Firewall: ufw, allow SSH only ─────────────────────────────────
# Oracle Ubuntu images pre-seed iptables with netfilter-persistent REJECT
# rules that bypass/conflict with ufw. Neutralize them once, then let ufw own
# the firewall.
if [[ -f /etc/iptables/rules.v4 ]] && grep -q "REJECT" /etc/iptables/rules.v4; then
  log "neutralizing Oracle's pre-seeded iptables rules (backup: rules.v4.orig)"
  cp -n /etc/iptables/rules.v4 /etc/iptables/rules.v4.orig
  cat > /etc/iptables/rules.v4 <<'EOF'
*filter
:INPUT ACCEPT [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
COMMIT
EOF
  netfilter-persistent reload || true
fi

log "configuring ufw (allow $SSH_PORT/tcp only)"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw limit "$SSH_PORT/tcp" comment "SSH (rate-limited)" >/dev/null
ufw --force enable >/dev/null
ufw status verbose

# ── 4. fail2ban + unattended-upgrades ────────────────────────────────
log "configuring fail2ban"
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = $SSH_PORT
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

log "enabling unattended-upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

# ── 5. Docker Engine + compose plugin ────────────────────────────────
if command -v docker &>/dev/null; then
  log "docker already installed: $(docker --version)"
else
  log "installing Docker Engine (official repo)"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
usermod -aG docker "$NEW_USER"

# ── 6. Docker log rotation ────────────────────────────────────────────
log "configuring Docker log rotation"
mkdir -p /etc/docker
if [[ ! -f /etc/docker/daemon.json ]] || ! grep -q "max-size" /etc/docker/daemon.json; then
  cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  systemctl restart docker
fi

# ── 7. Timezone ───────────────────────────────────────────────────────
log "timezone → $TIMEZONE"
timedatectl set-timezone "$TIMEZONE"

# ── Summary ───────────────────────────────────────────────────────────
echo
log "──────── verification checklist ────────"
log "user:        $(id "$NEW_USER")"
log "sshd:        $(sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication)' | tr '\n' ' ')"
log "ufw:         $(ufw status | head -1)"
log "fail2ban:    $(systemctl is-active fail2ban)"
log "auto-update: $(systemctl is-active unattended-upgrades)"
log "docker:      $(docker --version 2>/dev/null || echo MISSING)"
log "compose:     $(docker compose version 2>/dev/null || echo MISSING)"
log "timezone:    $(timedatectl show -p Timezone --value)"
echo
warn "NOW, BEFORE CLOSING THIS SESSION: open a NEW terminal and confirm"
warn "  ssh $NEW_USER@<ip> works and 'docker ps' runs without sudo"
warn "  (group membership needs a fresh login)."

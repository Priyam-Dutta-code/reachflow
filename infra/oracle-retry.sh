#!/usr/bin/env bash
# oracle-retry.sh — retry A1.Flex instance creation until Oracle has capacity.
#
# Prereqs: OCI CLI configured (`oci setup config`) — see docs/SETUP_ORACLE.md §5.
# Usage:   fill the variables below, then:  bash infra/oracle-retry.sh
# Stops on success; Ctrl+C to abort. Default: one attempt every 5 minutes.
#
# Where to find each value (Console):
#   COMPARTMENT_ID  Identity & Security → Compartments (root compartment OCID)
#   SUBNET_ID       Networking → VCNs → your VCN → Subnets → public subnet OCID
#   IMAGE_ID        Compute → Instances → Create → Image: Ubuntu 24.04 Minimal
#                   aarch64 → "View image details" → OCID  (region-specific!)
#   AD list         `oci iam availability-domain list` (names like "Xyz:AP-MUMBAI-1-AD-1")

set -euo pipefail

# ── Fill these in ───────────────────────────────────────────────────
COMPARTMENT_ID="${COMPARTMENT_ID:-ocid1.compartment.oc1..CHANGE_ME}"
SUBNET_ID="${SUBNET_ID:-ocid1.subnet.oc1..CHANGE_ME}"
IMAGE_ID="${IMAGE_ID:-ocid1.image.oc1..CHANGE_ME}"
SSH_PUBKEY_FILE="${SSH_PUBKEY_FILE:-$HOME/.ssh/reachflow.pub}"
DISPLAY_NAME="${DISPLAY_NAME:-reachflow-1}"
OCPUS="${OCPUS:-4}"
MEMORY_GB="${MEMORY_GB:-24}"
BOOT_GB="${BOOT_GB:-200}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"
# Space-separated AD names; cycle through all in multi-AD regions.
ADS="${ADS:-}"
# ────────────────────────────────────────────────────────────────────

for var in COMPARTMENT_ID SUBNET_ID IMAGE_ID; do
  if [[ "${!var}" == *CHANGE_ME* ]]; then
    echo "ERROR: set $var (see header comments)." >&2
    exit 1
  fi
done
[[ -f "$SSH_PUBKEY_FILE" ]] || { echo "ERROR: $SSH_PUBKEY_FILE not found." >&2; exit 1; }

if [[ -z "$ADS" ]]; then
  ADS=$(oci iam availability-domain list --compartment-id "$COMPARTMENT_ID" \
        --query 'data[].name' --raw-output | tr -d '[]," ' | tr '\n' ' ')
fi
echo "Availability domains to cycle: $ADS"

attempt=0
while true; do
  for ad in $ADS; do
    attempt=$((attempt + 1))
    echo "[$(date '+%F %T')] attempt #$attempt — AD: $ad"
    if oci compute instance launch \
        --compartment-id "$COMPARTMENT_ID" \
        --availability-domain "$ad" \
        --shape "VM.Standard.A1.Flex" \
        --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_GB}" \
        --image-id "$IMAGE_ID" \
        --subnet-id "$SUBNET_ID" \
        --assign-public-ip true \
        --boot-volume-size-in-gbs "$BOOT_GB" \
        --display-name "$DISPLAY_NAME" \
        --metadata "{\"ssh_authorized_keys\": \"$(cat "$SSH_PUBKEY_FILE")\"}" \
        2>/tmp/oci-retry-err.log; then
      echo "SUCCESS — instance launched in $ad. Check the Console for the public IP."
      exit 0
    fi
    if grep -qiE 'out of (host )?capacity|InternalError' /tmp/oci-retry-err.log; then
      echo "  no capacity in $ad"
    else
      echo "  non-capacity error — stopping so you can inspect:" >&2
      cat /tmp/oci-retry-err.log >&2
      exit 1
    fi
  done
  echo "  sleeping ${INTERVAL_SECONDS}s before next round..."
  sleep "$INTERVAL_SECONDS"
done

# Oracle Cloud setup — click-by-click runbook [HUMAN: Priyam]

Goal: one **VM.Standard.A1.Flex (4 OCPU / 24 GB / Ubuntu 24.04 aarch64)** Always
Free instance, reachable by SSH, ready for `infra/server-setup.sh`.

Time: ~20–30 min (plus possible capacity retries). Cost: ₹0 forever
(card needed for identity verification; expect a small temporary hold, ~$1,
refunded).

> Terms verified 2026-06-11: A1.Flex Always Free = 3,000 OCPU-hours +
> 18,000 GB-hours/month ≈ one 4-OCPU/24 GB VM, 200 GB total block storage,
> 10 TB/month egress. Idle reclamation applies to Always Free tenancies:
> instances idle over a 7-day window (95th-percentile CPU < 20% etc.) can be
> reclaimed after an email warning. Upgrading to Pay-As-You-Go removes the
> reclamation policy and improves capacity access while staying ₹0 if you only
> use Always Free shapes — recommended once the stack is stable.

---

## 0. Before you start — generate an SSH key (on your Windows machine)

Open PowerShell:

```powershell
ssh-keygen -t ed25519 -C "reachflow-server" -f $env:USERPROFILE\.ssh\reachflow
# press Enter twice for no passphrase, or set one (recommended)
Get-Content $env:USERPROFILE\.ssh\reachflow.pub   # copy this whole line
```

Keep the `.pub` content in your clipboard for step 3.

## 1. Create the account

1. Go to <https://signup.cloud.oracle.com> (or oracle.com → "Start for free").
2. Country: **India**. Use a real name/address matching your card.
3. Verify email → set password.
4. **Home region: choose deliberately — it is permanent and cannot be changed.**
   - `India South (Hyderabad)` or `India West (Mumbai)` for lowest latency.
   - Larger regions (e.g. `US East (Ashburn)`, `Germany Central (Frankfurt)`)
     historically have better A1 capacity, at the cost of ~150–250 ms latency.
   - Default per the plan: **Mumbai/Hyderabad, retry on capacity; PAYG if scarce.**
5. Card verification: any Visa/Mastercard credit card works best (some Indian
   debit cards fail the $1 auth — if declined, try another card). You will
   **not** be charged unless you explicitly upgrade *and* exceed free limits.
6. Wait for "Your tenancy is ready" email (minutes to a few hours).

## 2. Create the VM

1. Console → hamburger menu → **Compute → Instances** → **Create instance**.
2. Name: `reachflow-1`.
3. Compartment: leave the root compartment.
4. Placement: leave default AD (you'll cycle ADs if out of capacity).
5. **Image and shape** → Edit:
   - Image: **Canonical Ubuntu 24.04 Minimal** → make sure the build says
     **aarch64** once the shape below is selected.
   - Shape: **Ampere → VM.Standard.A1.Flex** → set **4 OCPUs / 24 GB memory**
     (max out the free allowance in one VM).
6. **Networking**: accept "Create new virtual cloud network" defaults
   (public subnet, assign public IPv4 address ✓).
7. **Add SSH keys** → "Paste public keys" → paste your `reachflow.pub` line.
8. **Boot volume**: set **200 GB** (free allowance; default is 47 GB — take
   the full 200 now, resizing later is annoying).
9. Create. Wait for state **Running**, note the **Public IP**.

### If you get "Out of capacity"

- Retry the same form with a **different Availability Domain** (AD-1/2/3 —
  Mumbai has 1 AD, Hyderabad 1 AD, larger regions 3).
- Retry at off-peak hours (early morning IST works disproportionately often).
- Try **2 OCPU / 12 GB** (still plenty for this stack) and resize up later.
- Automate: `infra/oracle-retry.sh` retries the launch every few minutes via
  the OCI CLI (setup in §5).
- Nuclear option that usually works: **upgrade to Pay-As-You-Go**
  (Billing → Upgrade and Manage Payment). PAYG accounts get priority capacity
  and lose the idle-reclamation policy; you still pay ₹0 while using only
  Always Free shapes. Set a **budget alert at ₹100** (Billing → Budgets) as a
  tripwire.

## 3. Open ONLY SSH in the cloud firewall

Oracle has its own firewall (Security Lists) in front of the VM.

1. Instance page → click the subnet link → click the **Default Security List**.
2. Ingress rules should contain **only**:
   - `0.0.0.0/0 → TCP 22` (SSH) — present by default.
3. **Do not add 80/443.** Web traffic enters through the Cloudflare Tunnel
   (outbound-only); zero open web ports is the design.
4. Egress: leave "all allowed".

## 4. First login + hardening

From PowerShell:

```powershell
ssh -i $env:USERPROFILE\.ssh\reachflow ubuntu@<PUBLIC_IP>
```

Then on the server:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/Priyam-Dutta-code/reachflow.git
cd reachflow
sudo bash infra/server-setup.sh        # idempotent; safe to re-run
```

The script creates the `reachflow` user, locks SSH to key-only, configures
ufw (22 only) + fail2ban + unattended-upgrades, installs Docker Engine +
compose plugin, sets log rotation and the Asia/Kolkata timezone, and prints a
verification checklist. After it finishes, **log in as the new user** and
confirm before closing your root/ubuntu session:

```powershell
ssh -i $env:USERPROFILE\.ssh\reachflow reachflow@<PUBLIC_IP>
docker ps        # should work without sudo
```

## 5. (Optional, for the retry script) OCI CLI on your Windows machine

Only needed if capacity forces automated retries:

```powershell
winget install Oracle.CLI   # or: pip install oci-cli
oci setup config            # tenancy/user OCIDs + region; creates an API key
# upload the generated public API key: Console → Profile → My profile → API keys
```

Then fill the variables at the top of `infra/oracle-retry.sh` (it tells you
how to find each OCID) and run it from Git Bash:
`bash infra/oracle-retry.sh`. Leave it running; it stops on success.

## 6. Post-create recommendations

- **Reserve the public IP** (it survives instance stop/start by default for
  ephemeral IPs only while assigned): Instance → Attached VNICs → IPv4 →
  Edit → Reserved IP. Free, and it keeps DNS stable.
- **PAYG upgrade** once everything runs (see §2) — removes reclamation risk.
- The app itself plus Uptime Kuma monitoring generates enough baseline
  activity to stay clear of the idle thresholds in normal operation.

## Done when

- [ ] `ssh reachflow@<IP>` works with the key, root/password login refused
- [ ] `docker compose version` works as the `reachflow` user
- [ ] Security List has TCP 22 only; `sudo ufw status` shows 22 only
- [ ] Public IP noted for the Cloudflare step (`docs/SETUP_CLOUDFLARE.md` —
      actually not even needed there: the tunnel is outbound-only)

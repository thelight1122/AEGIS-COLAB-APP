# AEGIS Git Forge — Activation Runbook v1.0

**Date:** 2026-06-16
**Target VM:** `aegis-git-forge` (resource group `rg-aegis-git`, eastus)
**Public IP:** `20.172.153.141`
**Azure DNS label (always works):** `aegis-git-forge.eastus.cloudapp.azure.com`
**Target domain:** `git.digitalmindtripai.com`
**Admin username on VM:** `aegisadmin` (SSH key auth only, password auth disabled)
**Subscription:** `183863c0-4aaf-4329-ba95-0db3760357f2` / Tenant `d6683e08-272d-438e-ba52-6455d8d7c3c3` (`traceypaegisalign.onmicrosoft.com`)

---

## Why this runbook exists

The original activation instructions for this VM were lost (separate AI session error). This runbook was reconstructed on 2026-06-16 by directly inspecting the live VM via `az vm run-command` (Azure CLI is authenticated and connected — no local SSH key needed for these steps) and the Azure NSG configuration. It reflects **actual confirmed state**, not assumptions.

---

## Confirmed Current State (as of 2026-06-16)

| Component | State |
|---|---|
| VM power state | Running, provisioning succeeded |
| OS | Ubuntu 22.04.5 LTS (jammy) |
| Forgejo | Installed at `/opt/forgejo/forgejo`, running as systemd service `forgejo.service` (user `git`, working dir `/var/lib/forgejo`), listening on `127.0.0.1:3000`/`0.0.0.0:3000` |
| Nginx | Installed and running, site `forgejo` enabled (`/etc/nginx/sites-available/forgejo` → `sites-enabled/`), serving HTTP 200 on port 80 |
| Certbot | Installed (`/usr/bin/certbot`), **no certificates issued yet** |
| NSG (`aegis-git-forgeNSG`) | Allows inbound 22 (SSH), 443 (HTTPS), 80 (`HTTP-LetsEncrypt` rule — already added for ACME challenge). Port 3000 is **not** in the NSG — Forgejo's raw port is not publicly reachable, which is correct. |
| Forgejo `app.ini` | `INSTALL_LOCK = false`, `DOMAIN = aegis-git-forge.eastus.cloudapp.azure.com`, `ROOT_URL = http://aegis-git-forge.eastus.cloudapp.azure.com/`, `HTTP_PORT = 3000` |
| DNS | `git.digitalmindtripai.com` → **NXDOMAIN** (not pointed at the VM yet) |
| Forgejo setup wizard | **Not completed** — `INSTALL_LOCK = false` means the first-run web setup (create admin account, finalize config) has never been run or locked |

**Bottom line:** the install is done; the activation (domain, TLS, first-admin-account, lock) is what's missing. This matches "I haven't activated it yet."

---

## Step 1 — Point DNS at the VM

In your DNS provider for `digitalmindtripai.com`, create:

```
Type: A
Host: git
Value: 20.172.153.141
TTL: 300 (or provider default)
```

Wait for propagation (check with `nslookup git.digitalmindtripai.com` or `Resolve-DnsName git.digitalmindtripai.com` — should return `20.172.153.141`). This can take a few minutes to an hour depending on the provider/TTL.

> Do not skip ahead to Step 3 (certbot) until this resolves — Let's Encrypt's HTTP-01 challenge needs the domain to actually point at the VM.

---

## Step 2 — Update Forgejo's domain config (pre-TLS)

SSH to the VM (or use `az vm run-command invoke`) and edit `/etc/forgejo/app.ini`:

```ini
DOMAIN   = git.digitalmindtripai.com
ROOT_URL = http://git.digitalmindtripai.com/
```

Then restart the service:

```bash
sudo systemctl restart forgejo
```

Verify it's serving on the new domain over plain HTTP first:

```bash
curl -I http://git.digitalmindtripai.com/
```

(Should return `HTTP/1.1 200 OK` once DNS has propagated.)

---

## Step 3 — Issue the TLS certificate

NSG already allows port 80/443, so this should work without further network changes:

```bash
sudo certbot --nginx -d git.digitalmindtripai.com --non-interactive --agree-tos -m <your-email> --redirect
```

`--redirect` makes certbot automatically rewrite the Nginx config to redirect HTTP → HTTPS. Verify:

```bash
sudo systemctl status nginx
curl -I https://git.digitalmindtripai.com/
```

Certbot also installs a renewal timer automatically (`certbot.timer` / `systemctl list-timers`) — no manual cron needed.

---

## Step 4 — Update Forgejo to the HTTPS root URL

Edit `/etc/forgejo/app.ini` again:

```ini
ROOT_URL = https://git.digitalmindtripai.com/
```

```bash
sudo systemctl restart forgejo
```

---

## Step 5 — Complete first-run setup and lock it

Because `INSTALL_LOCK = false`, the install wizard is still technically open. Two ways to close it safely:

**Option A — Browser (simplest):**
1. Visit `https://git.digitalmindtripai.com/` while `INSTALL_LOCK` is still `false`.
2. If Forgejo shows the install wizard, complete it: confirm database settings (default is usually SQLite at this scale), set the **first admin account** (this becomes the AEGIS Git Forge owner account), and submit.
3. Forgejo will set `INSTALL_LOCK = true` automatically on successful setup completion.

**Option B — CLI (no exposure window):**
```bash
sudo -u git /opt/forgejo/forgejo admin user create \
  --username aegis-admin \
  --password '<choose a strong password>' \
  --email <your-email> \
  --admin \
  --config /etc/forgejo/app.ini
```
Then manually set in `app.ini`:
```ini
INSTALL_LOCK = true
```
```bash
sudo systemctl restart forgejo
```

**Recommend Option B** — it avoids any window where the public install wizard is reachable before you've created the admin account.

---

## Step 6 — Verify and harden

```bash
# Confirm HTTPS works and redirects from HTTP
curl -I http://git.digitalmindtripai.com/
curl -I https://git.digitalmindtripai.com/

# Confirm port 3000 is still not publicly reachable (should time out / refuse from outside)
# (run from a machine OTHER than the VM itself)
curl -m 5 http://20.172.153.141:3000/ || echo "correctly unreachable"

# Confirm Forgejo + Nginx + cert renewal are all healthy
sudo systemctl status forgejo nginx certbot.timer
```

Checklist:
- [ ] DNS `git.digitalmindtripai.com` → `20.172.153.141`
- [ ] `https://git.digitalmindtripai.com/` loads with a valid cert
- [ ] HTTP redirects to HTTPS
- [ ] Admin account created, `INSTALL_LOCK = true`
- [ ] Port 3000 confirmed not reachable from outside the VM
- [ ] `certbot.timer` active for auto-renewal

---

## Notes for future Steward/Advocate resonance gate work

The architecture map (`AZURE-CURRENT-ARCHITECTURE-MAP-2026-06-16.md`) names the full planned stack as **Forgejo + Nginx + TLS + Temporal Tumbler + Steward/Advocate resonance gates**. This runbook only covers Forgejo + Nginx + TLS (the activation gap). Temporal Tumbler and the resonance gates are separate, not-yet-built layers — track those as their own follow-up, not part of this activation.

---

*AEGIS Git Forge Activation Runbook v1.0*
*Reconstructed 2026-06-16 from live VM inspection after original instructions were lost.*
*Mirrored to `I:\Codex\` per standing copy rule.*

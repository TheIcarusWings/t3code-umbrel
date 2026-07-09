# T3 Code for Umbrel

A community app store that runs the [T3 Code](https://github.com/pingdotgg/t3code) server on your Umbrel, turning it into a cloud coding workstation: repositories, git state, terminals, and agent sessions (Claude Code, Codex, Cursor, OpenCode) all live on the Umbrel and are usable from any device with a browser.

## Install

1. On your Umbrel, open the **App Store** -> three-dot menu -> **Community App Stores**.
2. Paste this repo's URL and add it.
3. Open the **Icarus App Store** and install **T3 Code**.

## First run

1. On the T3 Code page in your Umbrel dashboard, copy the **app password** shown in the credentials box.
2. Click **Open**. You land on a small "Connect this device" page.
3. Paste the password and continue - you are now paired.

Pairing persists per browser, so this is a one-time step per device.

Then open a terminal inside T3 Code and authenticate the providers you use:

- `claude auth login` (Claude Code, pre-installed)
- `codex login` (Codex, pre-installed)
- `opencode auth login` (OpenCode, pre-installed)

Repositories live under `~/projects` inside the app. Create a project from the sidebar, or `git clone` into `~/projects` from the built-in terminal and add the folder.

Provider auth, T3 state, and repos all persist in the app's data directory, so they survive updates and restarts.

## How pairing works, and why it needs the password

T3 Code requires a one-time pairing token whenever it is bound to a non-loopback address (which it always is here). This package adds two small services:

- a **gateway** (Caddy) that fronts the app and routes `/umbrel-setup` to the helper, everything else to T3 Code
- a **helper** that mints a short-lived pairing token via `t3 auth pairing create` and redirects your browser into T3 Code's `/pair` page

The helper mints a token **only for a caller that presents the app password**. That check matters because of how Umbrel networking works: every installed app shares one flat Docker network with inter-container traffic enabled, so any co-installed app can reach this helper directly and bypass Umbrel's dashboard login. Umbrel's proxy also strips its session cookie before forwarding, so the helper cannot verify your Umbrel session. The only secret a malicious peer app cannot know is `APP_PASSWORD` - Umbrel derives it per-install and injects it only into this app's own containers, and shows it to you on the app page. So the password, not network position, is what protects pairing.

To pair a phone or another device, open the app there and paste the same password. To pair a native T3 client (desktop/mobile app), run `t3 auth pairing create` from a terminal inside T3 Code.

## Remote access (outside your LAN)

Install the official **Tailscale** app on the Umbrel; T3 Code is then reachable over your tailnet at `http://<umbrel-tailscale-ip>:3773` from any device. The hosted web app at `https://app.t3.codes` needs an HTTPS endpoint and will not work with a plain-HTTP LAN address; use the direct URL instead.

Do not port-forward this app to the public internet.

## Security notes

- Minting a pairing token requires the app password (a high-entropy per-install secret only this app's containers hold). Tokens are single-use and expire in 10 minutes.
- Anyone with admin access to the Umbrel effectively has your provider sessions, since provider auth is stored in the app's data directory.
- Revoke sessions with `t3 auth session revoke` from a terminal inside the app.

## Repo layout

- `umbrel-app-store.yml` - community app store manifest
- `icarus-t3-code/` - the Umbrel app package (manifest + docker-compose)
- `docker/` - the image: Node 24 + `t3` + provider CLIs + the pairing helper, published to `ghcr.io/theicaruswings/t3code-umbrel` (linux/amd64 + linux/arm64) by the GitHub Actions workflow

Gateway config and the helper script are baked into the image rather than bind-mounted, because Umbrel seeds an app's data directory only on first install - a mounted copy could never be changed by an update.

## Updating

Bump the `ARG *_VERSION` values in `docker/Dockerfile` and push to `main`; CI builds and pushes the multi-arch image. Then update `version` in `icarus-t3-code/umbrel-app.yml` and the image digest in `icarus-t3-code/docker-compose.yml`:

```bash
docker buildx imagetools inspect ghcr.io/theicaruswings/t3code-umbrel:<version>
```

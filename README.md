# T3 Code for Umbrel

A community app store that runs the [T3 Code](https://github.com/pingdotgg/t3code) server on your Umbrel, turning it into a cloud coding workstation: repositories, git state, terminals, and agent sessions (Claude Code, Codex, Cursor, OpenCode) all live on the Umbrel and are usable from any device with a browser.

## Install

1. On your Umbrel, open the **App Store** -> three-dot menu -> **Community App Stores**.
2. Paste this repo's URL and add it.
3. Open the **Icarus App Store** and install **T3 Code**.

## First run

1. Open the app at `http://umbrel.local:3773`. T3 Code shows a pairing screen.
2. Get the one-time pairing token from the app logs: **Settings -> Troubleshoot -> T3 Code**. Look for the `pairingUrl` / token lines near startup.
3. Paste the token. Pairing is one-time per device; your browser keeps an authenticated session afterwards.
4. Open a terminal inside T3 Code and authenticate the providers you use:
   - `claude auth login` (Claude Code, pre-installed)
   - `codex login` (Codex, pre-installed)
   - `opencode auth login` (OpenCode, pre-installed)
5. Clone your repositories under `/data/home/projects` from the same terminal, then add each one as a project from the sidebar.

Provider auth, T3 state, and repos all persist under the app's data directory (`${APP_DATA_DIR}/data`), so they survive app updates and restarts.

## Pairing more devices

Each pairing token is single-use. To pair a phone or another laptop later, either restart the app (a fresh token is printed to the logs) or run `t3 auth pairing create` from a terminal inside T3 Code.

## Remote access (outside your LAN)

Install the official **Tailscale** app on the Umbrel; then T3 Code is reachable over your tailnet at `http://<umbrel-tailscale-ip>:3773` from any device. The hosted web app at `https://app.t3.codes` needs an HTTPS endpoint and will not work with a plain-HTTP LAN address; use the direct URL instead.

## Security notes

- T3 Code enforces its own token-pairing auth whenever it is bound to a non-loopback address, which this package always is. Umbrel's proxy auth wrapper is disabled (`PROXY_AUTH_ADD: "false"`) because the native T3 clients need direct WebSocket access.
- Treat pairing tokens like passwords. Revoke sessions with `t3 auth session revoke` from a terminal inside the app.
- Do not port-forward this app to the public internet. Use Tailscale or your LAN.

## Repo layout

- `umbrel-app-store.yml` - community app store manifest
- `icarus-t3-code/` - the Umbrel app package (manifest + docker-compose)
- `docker/` - the image: Node 24 + `t3` + provider CLIs, published to `ghcr.io/theicaruswings/t3code-umbrel` (linux/amd64 + linux/arm64) by the GitHub Actions workflow

## Updating

Bump the `ARG *_VERSION` values in `docker/Dockerfile`, push to `main` (CI builds and pushes the image), then update `version` in `icarus-t3-code/umbrel-app.yml` and the image tag/digest in `icarus-t3-code/docker-compose.yml`.

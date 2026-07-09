# T3 Code for Umbrel

A community app store that runs the [T3 Code](https://github.com/pingdotgg/t3code) server on your Umbrel, turning it into a cloud coding workstation: repositories, git state, terminals, and agent sessions (Claude Code, Codex, Cursor, OpenCode) all live on the Umbrel and are usable from any device with a browser.

## Install

1. On your Umbrel, open the **App Store** -> three-dot menu -> **Community App Stores**.
2. Paste this repo's URL and add it.
3. Open the **Icarus App Store** and install **T3 Code**.

## First run

Click **Open** on the app tile. That's it - you land in T3 Code already paired. No tokens to copy.

Then open a terminal inside T3 Code and authenticate the providers you use:

- `claude auth login` (Claude Code, pre-installed)
- `codex login` (Codex, pre-installed)
- `opencode auth login` (OpenCode, pre-installed)

Repositories live under `~/projects` inside the app. Create a project from the sidebar, or `git clone` into `~/projects` from the built-in terminal and add the folder.

Provider auth, T3 state, and repos all persist in the app's data directory, so they survive updates and restarts.

## How one-click pairing works

T3 Code requires a one-time pairing token whenever it is bound to a non-loopback address. Rather than making you copy that token out of the app logs, this package adds two small services:

- a **gateway** (Caddy) that fronts the app
- a **helper** that mints a fresh short-lived pairing token via `t3 auth pairing create` and redirects your browser to T3 Code's own `/pair` page

The helper is exposed only at `/umbrel-setup`, and that single path is protected by Umbrel's own dashboard authentication (`PROXY_AUTH_BLACKLIST`). So only someone already logged into your Umbrel can mint a token. Everything else bypasses Umbrel's auth wrapper, because T3 Code enforces its own auth and its native clients need direct WebSocket access.

To pair a phone or another device, open the app from the Umbrel dashboard on that device. To pair a native T3 client, run `t3 auth pairing create` from a terminal inside T3 Code.

## Remote access (outside your LAN)

Install the official **Tailscale** app on the Umbrel; T3 Code is then reachable over your tailnet at `http://<umbrel-tailscale-ip>:3773` from any device. The hosted web app at `https://app.t3.codes` needs an HTTPS endpoint and will not work with a plain-HTTP LAN address; use the direct URL instead.

Do not port-forward this app to the public internet.

## Security notes

- Only the `/umbrel-setup` path can mint pairing tokens, and it requires an Umbrel dashboard session. Tokens are single-use and expire in 10 minutes.
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

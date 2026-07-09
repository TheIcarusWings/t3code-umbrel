// Pairing helper.
//
// Threat model: every Umbrel app shares one flat docker network
// (umbrel_main_network, 10.21.0.0/16) with inter-container comms enabled, so
// ANY co-installed app can reach this container directly, bypassing Umbrel's
// app_proxy login. app_proxy also strips its session cookie before proxying
// and injects no trusted identity header, so the backend cannot verify the
// user's Umbrel session. The only secret a malicious peer app cannot know is
// APP_PASSWORD, which Umbrel derives per-install and injects only into this
// app's own containers. So minting a pairing token requires presenting it.
// Umbrel shows APP_PASSWORD on the app's page (deterministicPassword: true).
import { execFile } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const PORT = 3999;
const APP_PASSWORD = process.env.APP_PASSWORD ?? "";

const sha256 = (value) => createHash("sha256").update(String(value), "utf8").digest();

// Constant-time compare that also hides length differences.
const secretMatches = (candidate) => {
  if (APP_PASSWORD.length === 0) return false;
  return timingSafeEqual(sha256(candidate), sha256(APP_PASSWORD));
};

const page = (message, isError) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect to T3 Code</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;background:#0b0b0c;color:#e7e7ea;margin:0;
    display:grid;place-items:center;min-height:100vh}
  .card{width:min(92vw,420px);background:#141416;border:1px solid #26262b;border-radius:14px;padding:28px}
  h1{font-size:18px;margin:0 0 6px}
  p{color:#a1a1aa;margin:0 0 18px}
  input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:9px;
    border:1px solid #33333a;background:#0b0b0c;color:#e7e7ea;font-size:14px}
  button{width:100%;margin-top:12px;padding:11px;border:0;border-radius:9px;
    background:#4f46e5;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
  .err{color:#f87171;margin-top:12px;font-size:13px}
</style></head><body>
<form class="card" method="POST" action="/umbrel-setup">
  <h1>Connect this device to T3 Code</h1>
  <p>Paste the app password shown on the T3 Code page in your Umbrel dashboard, then continue.</p>
  <input name="key" type="password" autocomplete="off" autofocus placeholder="App password">
  <button type="submit">Continue</button>
  ${isError ? `<div class="err">${message}</div>` : ""}
</form></body></html>`;

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "cache-control": "no-store", ...headers });
  res.end(body);
};

const mintAndRedirect = (res) => {
  execFile(
    "t3",
    ["auth", "pairing", "create", "--json", "--ttl", "10m", "--label", "umbrel-setup"],
    { timeout: 15000 },
    (err, stdout) => {
      if (err) {
        send(res, 500, `Could not create a pairing token:\n${err.message}`, {
          "content-type": "text/plain",
        });
        return;
      }
      try {
        const { credential } = JSON.parse(stdout);
        send(res, 302, "", { location: `/pair#token=${encodeURIComponent(credential)}` });
      } catch {
        send(res, 500, "Unexpected output from t3 auth pairing create.", {
          "content-type": "text/plain",
        });
      }
    },
  );
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 4096) req.destroy();
    });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });

createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0];
  if (path !== "/umbrel-setup") {
    send(res, 404, "not found", { "content-type": "text/plain" });
    return;
  }

  if (APP_PASSWORD.length === 0) {
    send(res, 500, "APP_PASSWORD is not configured for this app.", {
      "content-type": "text/plain",
    });
    return;
  }

  if (req.method === "GET") {
    send(res, 200, page(), { "content-type": "text/html; charset=utf-8" });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const key = new URLSearchParams(body).get("key") ?? "";
    // Small fixed delay to blunt any online guessing; APP_PASSWORD is
    // high-entropy so this is belt-and-suspenders.
    await new Promise((r) => setTimeout(r, 400));
    if (secretMatches(key)) {
      mintAndRedirect(res);
    } else {
      send(res, 401, page("Incorrect password. Check the T3 Code page in Umbrel.", true), {
        "content-type": "text/html; charset=utf-8",
      });
    }
    return;
  }

  send(res, 405, "method not allowed", { "content-type": "text/plain" });
}).listen(PORT, "0.0.0.0");

// One-click pairing helper. Reached only through Umbrel's authenticated proxy
// path (/umbrel-setup), so only someone logged into the Umbrel dashboard can
// mint a pairing token. Mints a fresh one-time token via the t3 CLI and
// redirects the browser to t3's own /pair page, which auto-consumes it.
import { execFile } from "node:child_process";
import { createServer } from "node:http";

const PORT = 3999;

createServer((req, res) => {
  if (!req.url.startsWith("/umbrel-setup")) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  execFile(
    "t3",
    ["auth", "pairing", "create", "--json", "--ttl", "10m", "--label", "umbrel-one-click"],
    { timeout: 15000 },
    (err, stdout) => {
    if (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(`Could not create a pairing token:\n${err.message}`);
      return;
    }
    try {
      const { credential } = JSON.parse(stdout);
      res.writeHead(302, {
        location: `/pair#token=${encodeURIComponent(credential)}`,
        "cache-control": "no-store",
      });
      res.end();
    } catch {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("Unexpected output from t3 auth pairing create.");
    }
  },
  );
}).listen(PORT, "0.0.0.0");

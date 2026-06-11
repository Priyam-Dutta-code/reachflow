// ReachFlow V2 web — Phase 0 stub (no dependencies).
// Proves the compose wiring. Phase 5 replaces this directory with the real
// Next.js 15 app (Tailwind v4, output: "standalone").
import { createServer } from "node:http";

const PORT = process.env.PORT || 3000;

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ReachFlow V2 — dev stub</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #FAFAF7; color: #121915;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    main { text-align: center; }
    h1 { font-weight: 600; letter-spacing: -0.02em; }
    p { color: #6B7672; }
    code { background: #E9F3EF; color: #0E6F5C; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <main>
    <h1>ReachFlow V2</h1>
    <p>Phase 0 skeleton is running. The real app lands in Phase 5.</p>
    <p>API health: <code>http://localhost:8000/health</code></p>
  </main>
</body>
</html>`;

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "ReachFlow web (stub)" }));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(page);
});

server.listen(PORT, () => {
  console.log(`[web-stub] listening on :${PORT}`);
});

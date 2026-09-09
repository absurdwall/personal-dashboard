import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// PROTOTYPE FRAME — disposable local server.
const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PERSONAL_DASHBOARD_2_PORT ?? 4174);
const mime = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

function safeFile(relativePath) {
  const base = normalize(root).replace(/\/+$/, "");
  const file = normalize(join(base, relativePath));
  return file === base || file.startsWith(`${base}/`) ? file : null;
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
  const file = safeFile(pathname === "/" ? "index.html" : pathname.slice(1));
  if (!file) return response.writeHead(404).end("Not found");
  const stream = createReadStream(file);
  stream.on("open", () => {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => response.writeHead(404).end("Not found"));
}).listen(port, "127.0.0.1", () => {
  console.log(`Personal Dashboard 2.0 frame: http://127.0.0.1:${port}/?variant=A&screen=today&phase=progress`);
  console.log("Synthetic data only. Press Ctrl+C to stop.");
});

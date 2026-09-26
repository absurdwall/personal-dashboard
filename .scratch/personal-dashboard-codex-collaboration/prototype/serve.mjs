import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// PROTOTYPE — local static server for the Codex Collaboration UI exploration.
const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PROTOTYPE_PORT ?? 4176);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function resolveFile(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const base = normalize(root).replace(/\/+$/, "");
  const filePath = normalize(join(base, relative));
  return filePath === base || filePath.startsWith(`${base}/`) ? filePath : null;
}

createServer((request, response) => {
  const requestPath = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  const filePath = resolveFile(requestPath);
  if (!filePath) { response.writeHead(404).end("Not found"); return; }
  const stream = createReadStream(filePath);
  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => response.writeHead(404).end("Not found"));
}).listen(port, "127.0.0.1", () => {
  console.log(`Personal Dashboard Codex Collaboration prototype: http://127.0.0.1:${port}/?variant=A`);
  console.log(`Variants: ?variant=A, ?variant=B, ?variant=C. Press Ctrl+C to stop.`);
});

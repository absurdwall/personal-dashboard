import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// THROWAWAY PROTOTYPE SERVER — defaults to an OS-selected free local port.
const root = fileURLToPath(new URL("./", import.meta.url));
const requestedPort = Number(process.env.PERSONAL_DASHBOARD_4_PORT ?? 0);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function safeFile(relativePath) {
  const base = normalize(root).replace(/\/+$/, "");
  const file = normalize(join(base, relativePath));
  return file === base || file.startsWith(`${base}/`) ? file : null;
}

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = safeFile(pathname === "/" ? "index.html" : pathname.slice(1));
  if (!file) return response.writeHead(404).end("Not found");
  const stream = createReadStream(file);
  stream.on("open", () => {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
    });
    stream.pipe(response);
  });
  stream.on("error", () => response.writeHead(404).end("Not found"));
});

server.listen(requestedPort, "127.0.0.1", () => {
  const { port } = server.address();
  console.log(`Personal Dashboard 4.0 prototype: http://127.0.0.1:${port}/?screen=today&variant=B&lang=zh`);
  console.log("Synthetic in-memory data only. Refresh resets state. Press Ctrl+C to stop.");
});

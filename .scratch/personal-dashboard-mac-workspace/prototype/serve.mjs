import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

// PROTOTYPE — disposable local server for the fixture-only Mac workspace.
const root = new URL("./", import.meta.url).pathname;
const currentFixture = "ticket-08-week-flow";
const currentPrefix = `/${currentFixture}`;
const historicalPrefix = "/historical";
const port = Number(process.env.PROTOTYPE_PORT ?? 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function fileWithin(base, relativePath) {
  const basePath = normalize(base).replace(/\/+$/, "");
  const filePath = normalize(join(basePath, relativePath));
  return filePath === basePath || filePath.startsWith(`${basePath}/`) ? filePath : null;
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function resolveFile(requestPath) {
  const currentRoot = join(root, currentFixture);

  if (requestPath === "/" || requestPath === "/index.html") {
    return fileWithin(currentRoot, "index.html");
  }

  if (requestPath === currentPrefix || requestPath === `${currentPrefix}/`) {
    return fileWithin(currentRoot, "index.html");
  }

  if (requestPath.startsWith(`${currentPrefix}/`)) {
    return fileWithin(currentRoot, requestPath.slice(`${currentPrefix}/`.length));
  }

  if (requestPath === `${historicalPrefix}/`) return fileWithin(root, "index.html");

  if (requestPath.startsWith(`${historicalPrefix}/`)) {
    return fileWithin(root, requestPath.slice(`${historicalPrefix}/`.length));
  }

  // The current fixture is also loaded from / so its relative assets resolve
  // to the same v2 files without exposing the historical root entry.
  if (!requestPath.includes("/", 1)) {
    return fileWithin(currentRoot, requestPath.slice(1));
  }

  return null;
}

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
  if (requestPath === currentPrefix || requestPath === historicalPrefix) {
    redirect(response, `${requestPath}/`);
    return;
  }

  if (requestPath === "/comparison.html") {
    redirect(response, `${historicalPrefix}/comparison.html`);
    return;
  }

  const filePath = resolveFile(requestPath);
  if (!filePath) {
    response.writeHead(404).end("Not found");
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => response.writeHead(404).end("Not found"));
}).listen(port, "127.0.0.1", () => {
  console.log(`Personal Dashboard Mac workspace prototype (v2 A — List + temporary sheet): http://127.0.0.1:${port}/`);
  console.log(`Current fixture: http://127.0.0.1:${port}${currentPrefix}/`);
  console.log("Press Ctrl+C to stop.");
});

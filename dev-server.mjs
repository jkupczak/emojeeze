import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "5173", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const pathname = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(rootDir, pathname);
  const relative = path.relative(rootDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Not found: ${req.url}\n\nServing from: ${rootDir}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `\nPort ${port} is already in use (often another Vite/dev tool).\n` +
        `  Option A: stop it —  lsof -i :${port}   then   kill <PID>\n` +
        `  Option B: use another port —  PORT=3000 npm run dev\n`,
    );
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`\nEmojeeze dev server running`);
  console.log(`  http://localhost:${port}/`);
  console.log(`  http://127.0.0.1:${port}/`);
  console.log(`Serving: ${rootDir}\n`);
});

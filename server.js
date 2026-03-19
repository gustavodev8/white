import http from "http";
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html":  "text/html; charset=utf-8",
  ".js":    "application/javascript",
  ".css":   "text/css",
  ".svg":   "image/svg+xml",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".ico":   "image/x-icon",
  ".json":  "application/json",
  ".woff2": "font/woff2",
  ".woff":  "font/woff",
};

http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url.split("?")[0]);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, "index.html"); // SPA fallback
  }

  const ext  = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

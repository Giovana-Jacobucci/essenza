const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, 'public_html');
const port = Number(process.env.PORT || 5500);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  const relativePath = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Arquivo não encontrado");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`Essenza local: http://localhost:${port}`);
  console.log(`Produção: https://essenzamodaeperfumaria.com/`);
});

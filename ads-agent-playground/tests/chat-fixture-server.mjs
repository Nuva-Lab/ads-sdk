import http from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [resolve(root, "tests/chat-fixture.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
  loader: { ".txt": "text" },
});
const html = (await readFile(resolve(root, "index.html"), "utf8")).replace(
  '<html lang="zh-CN">',
  '<html lang="zh-CN" data-test-fixture>',
);
let history = 0;
const sent = [];
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440"><rect width="440" height="440" fill="#e5ddce"/><ellipse cx="220" cy="366" rx="96" ry="14" fill="#d2c9b8"/><path d="M150 123h140l-14 223q-55 22-111 0z" fill="#b5bea4"/><rect x="149" y="105" width="142" height="27" rx="8" fill="#52614d"/><text x="220" y="247" text-anchor="middle" font-size="18" font-family="Georgia" fill="#5a684e">morrow</text></svg>';
http
  .createServer(async (req, res) => {
    if (req.url === "/test-send" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      sent.push(JSON.parse(body));
      res.end("ok");
      return;
    }
    if (req.url === "/history-request" && req.method === "POST") {
      history++;
      req.resume();
      res.end("ok");
      return;
    }
    if (req.url === "/prompt-source") {
      res.setHeader("Content-Type", "text/plain");
      res.end(
        await readFile(resolve(root, "tests/fixtures/prompt-content.txt")),
      );
      return;
    }
    if (req.url === "/events") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ history, sent }));
      return;
    }
    if (req.url === "/client.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(result.outputFiles[0].text);
      return;
    }
    if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(await readFile(resolve(root, "style.css")));
      return;
    }
    if (req.url === "/cup.svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(svg);
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  })
  .listen(Number(process.env.PORT || 9000), "127.0.0.1", () =>
    console.log("Chat rendering fixture: http://127.0.0.1:9000/"),
  );

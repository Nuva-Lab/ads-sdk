import http from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [resolve(root, "tests/ui-fixture.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  write: false,
});
const events = [];
let stops = 0;
const html = (await readFile(resolve(root, "index.html"), "utf8")).replace(
  '<html lang="zh-CN">',
  '<html lang="zh-CN" data-test-fixture>',
);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="440"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#e5d9c4"/><stop offset="1" stop-color="#f6f2e9"/></linearGradient><linearGradient id="cup"><stop stop-color="#a9b296"/><stop offset=".55" stop-color="#c5cbb7"/><stop offset="1" stop-color="#a9b296"/></linearGradient></defs><rect width="440" height="440" fill="url(#bg)"/><ellipse cx="225" cy="369" rx="107" ry="17" fill="#d5ccb9"/><path d="M154 126h139l-12 223q-54 27-111 0z" fill="url(#cup)"/><rect x="151" y="108" width="144" height="28" rx="11" fill="#536153"/><rect x="170" y="99" width="106" height="17" rx="6" fill="#485246"/><text x="222" y="249" fill="#5a6651" font-size="17" text-anchor="middle" font-family="Georgia">morrow</text></svg>';
http
  .createServer(async (req, res) => {
    if (req.method === "POST") {
      let body = "";
      for await (const c of req) body += c;
      if (req.url === "/test-events") events.push(JSON.parse(body));
      if (req.url === "/test-stop") stops++;
      res.end("ok");
      return;
    }
    if (req.url === "/mobile") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<html><body style="margin:0;background:#e9ebe5"><iframe src="/" title="Mobile playground" style="width:390px;height:844px;border:0"></iframe></body></html>',
      );
      return;
    }
    if (req.url === "/events") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ events, stops }));
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
    if (req.url === "/reference.mp4" || req.url === "/reference.wav") {
      const file = req.url.slice(1);
      res.setHeader(
        "Content-Type",
        file.endsWith("mp4") ? "video/mp4" : "audio/wav",
      );
      res.end(await readFile(resolve(root, "tests/fixtures", file)));
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
  .listen(Number(process.env.PORT || 8996), "127.0.0.1", () =>
    console.log("UI fixture: http://127.0.0.1:8996/"),
  );

/** Loopback playground host. Only public SDK routes are proxied; tokens are not stored here. */
import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlayground } from "./build.mjs";
const root = dirname(fileURLToPath(import.meta.url));
export function endpoint(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter an HTTP or HTTPS service URL without credentials or query parameters.",
    );
  return url.href.replace(/\/$/, "");
}
export function publicPath(service, path, method) {
  if (service === "agent")
    return (
      (path === "rpc" && method === "POST") ||
      (path === "agent" && method === "GET")
    );
  if (service === "generation")
    return (
      method === "POST" &&
      /^v1\/(?:generate\/(?:script|prompt)|assemble)$/.test(path)
    );
  if (service !== "store" || !/^(GET|POST|PUT|DELETE|PATCH|HEAD)$/.test(method))
    return false;
  if (
    /^(?:v1\/admin|internal|_dev)\b/.test(path) ||
    /\/(?:log|creation-trace)(?:\/|$)/.test(path)
  )
    return false;
  return (
    /^v1\/(?:products|brands|characters|assets|artifacts|jobs|ads|batches|skills)(?:\/|$)/.test(
      path,
    ) || path === "v1/generate/video"
  );
}
export async function startServer({ port = 8995, build = true } = {}) {
  if (build) await buildPlayground();
  const connections = new Map();
  const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/client.js", ["client.js", "text/javascript"]],
    ["/style.css", ["style.css", "text/css"]],
  ]);
  const sockets = new Set();
  const error = (res, status, message) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ error: message }));
  };
  let origin;
  function local(req) {
    return (
      req.headers.host === new URL(origin).host &&
      (!req.headers.origin || req.headers.origin === origin) &&
      !["cross-site", "same-site"].includes(req.headers["sec-fetch-site"])
    );
  }
  function target(req) {
    const url = new URL(req.url, origin);
    const match =
      /^\/connections\/([0-9a-f-]+)\/(agent|store|generation)\/(.*)$/.exec(
        url.pathname,
      );
    if (!match) return;
    const [, id, service, path] = match,
      config = connections.get(id);
    if (!config || !publicPath(service, path, req.method) || /%|\\/.test(path))
      return;
    return new URL(`${config[service]}/${path}${url.search}`);
  }
  const server = http.createServer(async (req, res) => {
    if (!local(req))
      return error(res, 403, "Open this playground from its local address.");
    try {
      if (req.method === "POST" && req.url === "/playground/connect") {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 16384)
            return error(res, 413, "Connection settings are too large.");
        }
        const body = JSON.parse(raw);
        const config = {
          agent: endpoint(body.agent),
          store: endpoint(body.store),
          generation: endpoint(body.generation),
        };
        if (connections.size >= 64)
          return error(
            res,
            429,
            "Close unused connections before adding another.",
          );
        const id = randomUUID();
        connections.set(id, config);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        return res.end(
          JSON.stringify({
            id,
            agent: `${origin}/connections/${id}/agent`,
            store: `${origin}/connections/${id}/store`,
            generation: `${origin}/connections/${id}/generation`,
          }),
        );
      }
      if (
        req.method === "DELETE" &&
        req.url?.startsWith("/playground/connections/")
      ) {
        connections.delete(req.url.slice("/playground/connections/".length));
        res.writeHead(204);
        return res.end();
      }
      const route = target(req);
      if (route) {
        const headers = { ...req.headers, host: route.host };
        for (const key of [
          "origin",
          "cookie",
          "connection",
          "proxy-authorization",
          "referer",
        ])
          delete headers[key];
        const upstream = (route.protocol === "https:" ? https : http).request(
          route,
          { method: req.method, headers },
          (response) => {
            const output = { ...response.headers };
            delete output["set-cookie"];
            res.writeHead(response.statusCode ?? 502, output);
            response.pipe(res);
          },
        );
        upstream.setTimeout(120000, () =>
          upstream.destroy(new Error("timeout")),
        );
        upstream.on("error", () => {
          if (!res.headersSent)
            error(res, 502, "The service could not be reached.");
          else res.destroy();
        });
        res.on("close", () => {
          if (!res.writableEnded) upstream.destroy();
        });
        req.pipe(upstream);
        return;
      }
      const asset = assets.get(new URL(req.url, origin).pathname);
      if (req.method !== "GET" || !asset) return error(res, 404, "Not found.");
      const [file, mime] = asset;
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: blob: data:; media-src 'self' https: http: blob:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'none'; base-uri 'none'",
      });
      res.end(await readFile(resolve(root, "dist", file)));
    } catch {
      error(res, 400, "Check your connection settings and try again.");
    }
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (req, socket, head) => {
    const route = local(req) ? target(req) : undefined;
    if (!route || !req.url.includes("/agent/agent")) {
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    const headers = { ...req.headers, host: route.host };
    delete headers.cookie;
    // Origin remains the actual browser origin; the Agent owns WebSocket origin admission.
    const upstream = (route.protocol === "https:" ? https : http).request(
      route,
      { headers },
    );
    upstream.on("upgrade", (response, remote, remoteHead) => {
      sockets.add(remote);
      remote.on("close", () => sockets.delete(remote));
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n")}\r\n\r\n`,
      );
      if (remoteHead.length) socket.write(remoteHead);
      if (head.length) remote.write(head);
      socket.pipe(remote).pipe(socket);
      socket.on("error", () => remote.destroy());
      remote.on("error", () => socket.destroy());
      socket.on("close", () => remote.destroy());
    });
    upstream.on("response", (response) => {
      socket.end(
        `HTTP/1.1 ${response.statusCode ?? 502} Connection rejected\r\n\r\n`,
      );
      response.resume();
    });
    upstream.on("error", () => socket.destroy());
    upstream.end();
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", accept);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const index = process.argv.indexOf("--port");
  const app = await startServer({
    port: index < 0 ? 8995 : Number(process.argv[index + 1]),
  });
  console.log(`Ads Agent Playground: ${app.origin}`);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => void app.close().then(() => process.exit(0)));
}

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { startServer, endpoint, publicPath } from "../server.mjs";

test("the proxy only exposes public SDK paths", () => {
  assert.equal(publicPath("generation", "v1/assemble", "POST"), true);
  assert.equal(publicPath("agent", "rpc", "POST"), true);
  for (const path of [
    "_dev/config",
    "_dev/inspector",
    "internal/admin",
    "v1/admin/tokens",
    "v1/batches/id/log",
    "v1/batches/id/creation-trace",
  ])
    assert.equal(publicPath("store", path, "GET"), false, path);
  assert.equal(publicPath("agent", "status", "GET"), false);
  assert.throws(() => endpoint("https://secret@example.com"));
  assert.throws(() => endpoint("file:///tmp"));
  assert.throws(() => endpoint("https://example.com?token=abc"));
});
test("browser isolation and private-route exclusion survive actual requests", async () => {
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push({
      path: req.url,
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ items: [] }));
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${upstream.address().port}`,
    app = await startServer({ port: 0 });
  try {
    const cross = await fetch(app.origin + "/playground/connect", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent: base, store: base, generation: base }),
    });
    assert.equal(cross.status, 403);
    const connected = await fetch(app.origin + "/playground/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent: base + "/api",
        store: base,
        generation: base,
      }),
    });
    assert.equal(connected.status, 200);
    const config = await connected.json();
    assert.deepEqual(Object.keys(config).sort(), [
      "agent",
      "generation",
      "id",
      "store",
    ]);
    const read = await fetch(config.store + "/v1/products", {
      headers: {
        Authorization: "Bearer test-user-token",
        Cookie: "private=value",
      },
    });
    assert.equal(read.status, 200);
    assert.deepEqual(seen, [
      {
        path: "/v1/products",
        authorization: "Bearer test-user-token",
        cookie: undefined,
      },
    ]);
    for (const path of [
      "/status",
      "/_dev/config",
      `/connections/${config.id}/store/v1/admin/tokens`,
      `/connections/${config.id}/store/v1/batches/id/creation-trace`,
    ])
      assert.equal((await fetch(app.origin + path)).status, 404, path);
    const html = await (await fetch(app.origin)).text();
    assert.doesNotMatch(
      html,
      /Staging validation|real video API|internal telemetry|status-link/,
    );
    await fetch(app.origin + "/playground/connections/" + config.id, {
      method: "DELETE",
    });
    assert.equal((await fetch(config.store + "/v1/products")).status, 404);
  } finally {
    await app.close();
    await new Promise((resolve) => upstream.close(resolve));
  }
});
test("Agent WebSocket frames pass through without inspector routes", async () => {
  const upstream = http.createServer(),
    wss = new WebSocketServer({ noServer: true });
  upstream.on("upgrade", (req, socket, head) => {
    assert.equal(req.url, "/api/agent");
    wss.handleUpgrade(req, socket, head, (ws) =>
      ws.on("message", (data) => ws.send(data)),
    );
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${upstream.address().port}`,
    app = await startServer({ port: 0 });
  let ws;
  try {
    const config = await (
      await fetch(app.origin + "/playground/connect", {
        method: "POST",
        body: JSON.stringify({
          agent: base + "/api",
          store: base,
          generation: base,
        }),
      })
    ).json();
    ws = new WebSocket(config.agent.replace("http:", "ws:") + "/agent", {
      origin: app.origin,
    });
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    const received = new Promise((resolve) =>
      ws.once("message", (data) => resolve(String(data))),
    );
    ws.send(JSON.stringify({ type: "auth", token: "fixture" }));
    assert.equal(await received, '{"type":"auth","token":"fixture"}');
  } finally {
    ws?.terminate();
    for (const client of wss.clients) client.terminate();
    await app.close();
    await new Promise((resolve) => upstream.close(resolve));
    wss.close();
  }
});

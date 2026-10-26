/** Local integration fixture only. No external requests or generation. */
import http from "node:http";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
export async function startAuthFixture() {
  const stats = { issued: 0, userRequests: 0, adminKeyExposed: false };
  const tokens = new Set(),
    session = {
      id: "test-session",
      kind: "work",
      title: "Playground check",
      owner: {
        userId: "11111111-1111-4111-8111-111111111111",
        displayName: "Test user",
      },
      createdAt: new Date().toISOString(),
    };
  const state = {
    type: "state",
    sessionId: session.id,
    sequence: 1,
    state: {
      status: "idle",
      session,
      messages: { items: [], nextCursor: null },
    },
    hostCalls: [],
  };
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/admin/tokens") {
      if (req.headers.authorization !== "Bearer local-admin-fixture") {
        res.writeHead(401);
        res.end("{}");
        return;
      }
      const input = JSON.parse(raw);
      if (input.external_user_id !== "playground-fixture-user") {
        res.writeHead(400);
        res.end("{}");
        return;
      }
      stats.issued++;
      const token = "local-user-" + randomUUID();
      tokens.add(token);
      res.end(
        JSON.stringify({
          access_token: token,
          token_type: "Bearer",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: session.owner.userId,
            external_user_id: input.external_user_id,
          },
        }),
      );
      return;
    }
    if (req.headers.authorization === "Bearer local-admin-fixture")
      stats.adminKeyExposed = true;
    if (!tokens.has(req.headers.authorization?.replace(/^Bearer /, ""))) {
      res.writeHead(401);
      res.end("{}");
      return;
    }
    stats.userRequests++;
    if (req.url.startsWith("/v1/sessions")) {
      res.end(
        JSON.stringify(
          req.url.split("?")[0] === "/v1/sessions"
            ? { items: [session], nextCursor: null }
            : session,
        ),
      );
      return;
    }
    if (req.url === "/api/rpc") {
      const frame = JSON.parse(raw);
      let result;
      if (frame.method === "sessions.list")
        result = { items: [session], nextCursor: null };
      else if (frame.method === "sessions.get") result = session;
      else if (frame.method === "sessions.history")
        result = { items: [], nextCursor: null };
      else {
        res.writeHead(400);
        res.end("{}");
        return;
      }
      res.end(JSON.stringify({ type: "result", id: frame.id, result }));
      return;
    }
    if (
      req.url.startsWith("/v1/products") ||
      req.url.startsWith("/v1/brands")
    ) {
      res.end(JSON.stringify({ items: [], next_cursor: null }));
      return;
    }
    res.writeHead(404);
    res.end("{}");
  });
  const ws = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/api/agent") {
      socket.destroy();
      return;
    }
    ws.handleUpgrade(req, socket, head, (client) => {
      let authed = false;
      client.on("message", (data) => {
        const frame = JSON.parse(String(data));
        if (frame.type === "auth" || frame.type === "reauth") {
          if (!tokens.has(frame.token)) {
            client.close();
            return;
          }
          authed = true;
          client.send(
            JSON.stringify(
              frame.type === "auth"
                ? { type: "ready" }
                : { type: "reauthenticated", id: frame.id },
            ),
          );
          return;
        }
        if (!authed) {
          client.close();
          return;
        }
        if (frame.method === "agent.subscribe") {
          client.send(
            JSON.stringify({
              type: "result",
              id: frame.id,
              result: { subscribed: true },
            }),
          );
          client.send(JSON.stringify(state));
        } else if (frame.method === "agent.snapshot")
          client.send(
            JSON.stringify({ type: "result", id: frame.id, result: state }),
          );
      });
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    stats,
    close: async () => {
      for (const c of ws.clients) c.terminate();
      await new Promise((resolve) => server.close(resolve));
      ws.close();
    },
  };
}

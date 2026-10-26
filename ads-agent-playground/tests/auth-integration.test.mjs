import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { startAuthFixture } from "./auth-fixture.mjs";
import { createNuva } from "../../typescript/dist/index.js";
test(
  "pnpm launcher serves Go, refreshes tokens and connects the real SDK",
  { timeout: 90000 },
  async () => {
    const backend = await startAuthFixture(),
      temporary = await mkdtemp(resolve(tmpdir(), "playground-launch-"));
    let child, sdk;
    try {
      const envFile = resolve(temporary, ".env");
      await writeFile(
        envFile,
        `NUVA_CUSTOMER_API_KEY=local-admin-fixture\nNUVA_EXTERNAL_USER_ID=playground-fixture-user\nNUVA_STORE_URL=${backend.origin}\nNUVA_AGENT_URL=${backend.origin}/api\nNUVA_GENERATION_URL=${backend.origin}\n`,
      );
      const env = { ...process.env };
      for (const name of [
        "NUVA_CUSTOMER_API_KEY",
        "NUVA_EXTERNAL_USER_ID",
        "NUVA_STORE_URL",
        "NUVA_AGENT_URL",
        "NUVA_GENERATION_URL",
      ])
        delete env[name];
      child = spawn(
        process.execPath,
        [
          fileURLToPath(new URL("../start.mjs", import.meta.url)),
          "--env-file",
          envFile,
          "--port",
          "0",
        ],
        { env, stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      const origin = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Playground startup timed out.")),
          60000,
        );
        const read = (chunk) => {
          output += String(chunk);
          const match =
            /Ads Agent Playground: (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
          if (match) {
            clearTimeout(timeout);
            resolve(match[1]);
          }
        };
        child.stdout.on("data", read);
        child.stderr.on("data", read);
        child.once("exit", (code) => {
          clearTimeout(timeout);
          reject(new Error(`Playground exited ${code}: ${output}`));
        });
      });
      assert.doesNotMatch(output, /local-admin-fixture/);
      assert.equal(backend.stats.issued, 1);
      const defaults = await (
        await fetch(origin + "/playground/config")
      ).json();
      assert.equal(defaults.store, backend.origin);
      const connection = await (
        await fetch(origin + "/playground/connect", {
          method: "POST",
          body: JSON.stringify(defaults),
        })
      ).json();
      sdk = createNuva({
        baseUrl: connection.agent,
        storeBaseUrl: connection.store,
        generationBaseUrl: connection.generation,
        getAccessToken: async () =>
          await (await fetch(origin + "/playground/token")).json(),
      });
      const sessions = await sdk.sessions.list({ limit: 5 });
      assert.equal(sessions.items[0].title, "Playground check");
      const loaded = new Promise((resolve, reject) => {
        let stop;
        const timeout = setTimeout(
          () => reject(new Error("No Agent state")),
          5000,
        );
        stop = sdk
          .agent({ sessionId: sessions.items[0].id })
          .subscribe((state) => {
            if (state.status === "idle") {
              clearTimeout(timeout);
              stop?.();
              resolve(state);
            }
            if (state.status === "error") {
              clearTimeout(timeout);
              reject(new Error(state.error.message));
            }
          });
      });
      await loaded;
      assert.equal(backend.stats.issued, 1);
      const first = await (await fetch(origin + "/playground/token")).json();
      const second = await (
        await fetch(origin + "/playground/token?force=1")
      ).json();
      assert.notEqual(first.token, second.token);
      assert.equal(backend.stats.issued, 2);
      assert.equal(backend.stats.adminKeyExposed, false);
      const html = await (await fetch(origin)).text();
      assert.doesNotMatch(html, /user-token|Paste your user token/);
    const script = await (await fetch(origin + "/client.js")).text();
    assert.doesNotMatch(script, /local-admin-fixture|local-user-/);
    } finally {
      sdk?.close();
      if (child && child.exitCode === null) {
        const ended = new Promise((resolve) => child.once("exit", resolve));
        child.kill("SIGTERM");
        await ended;
      }
      await backend.close();
      await rm(temporary, { recursive: true, force: true });
    }
  },
);

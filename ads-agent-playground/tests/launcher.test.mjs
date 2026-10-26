import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const launcher = fileURLToPath(new URL("../start.mjs", import.meta.url));
const cleanEnv = () => {
  const env = { ...process.env };
  for (const name of ["NUVA_CUSTOMER_API_KEY", "NUVA_EXTERNAL_USER_ID"])
    delete env[name];
  return env;
};
test("missing credentials fail before starting servers or requesting a token", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "playground-env-"));
  try {
    const file = resolve(dir, ".env");
    await writeFile(file, "");
    const result = spawnSync(process.execPath, [launcher, "--env-file", file], {
      env: cleanEnv(),
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /NUVA_CUSTOMER_API_KEY/);
    assert.match(result.stderr, /NUVA_EXTERNAL_USER_ID/);
    assert.doesNotMatch(result.stdout, /Ads Agent Playground: http/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("env files are read without printing their key, and process env takes precedence", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "playground-env-"));
  try {
    const file = resolve(dir, ".env");
    await writeFile(
      file,
      "NUVA_CUSTOMER_API_KEY=private-test-value\nNUVA_EXTERNAL_USER_ID=from-file\n",
    );
    const result = spawnSync(process.execPath, [launcher, "--env-file", file], {
      env: { ...cleanEnv(), NUVA_EXTERNAL_USER_ID: "" },
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /NUVA_EXTERNAL_USER_ID/);
    assert.doesNotMatch(result.stderr, /private-test-value/);
    assert.doesNotMatch(result.stderr, /NUVA_CUSTOMER_API_KEY/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/** Build the UI and launch the local Go host. Credentials stay in process environment. */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlayground } from "./build.mjs";
const root = dirname(fileURLToPath(import.meta.url)),
  repo = resolve(root, "..");
let envFile = resolve(repo, ".env"),
  explicitEnv = false,
  port = "8995";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--env-file" && args[i + 1]) {
    envFile = resolve(process.env.INIT_CWD ?? process.cwd(), args[++i]);
    explicitEnv = true;
  } else if (args[i] === "--port" && args[i + 1]) port = args[++i];
  else if (args[i] === "--help") {
    console.log("pnpm playground [--env-file path] [--port 8995]");
    process.exit(0);
  } else {
    console.error("Unknown playground option. Use --help.");
    process.exit(1);
  }
}
try {
  if (existsSync(envFile)) loadEnvFile(envFile);
  else if (explicitEnv)
    throw new Error("The requested environment file does not exist.");
  const missing = ["NUVA_CUSTOMER_API_KEY", "NUVA_EXTERNAL_USER_ID"].filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length)
    throw new Error(
      `Missing required settings: ${missing.join(", ")}. Set them in .env or the environment.`,
    );
  if (!/^\d+$/.test(port) || Number(port) > 65535)
    throw new Error("Use a valid local port.");
  const go = spawnSync("go", ["version"], { stdio: "pipe" });
  if (go.status !== 0)
    throw new Error("Go 1.22 or newer is required to run the playground.");
  const sdk = spawnSync(
    "pnpm",
    ["--dir", resolve(repo, "typescript"), "build"],
    { stdio: "inherit" },
  );
  if (sdk.status !== 0) throw new Error("SDK build failed.");
  await buildPlayground();
  await mkdir(resolve(root, ".local"), { recursive: true });
  const binary = resolve(
    root,
    ".local",
    process.platform === "win32"
      ? "playground-server.exe"
      : "playground-server",
  );
  const compiled = spawnSync("go", ["build", "-o", binary, "."], {
    cwd: resolve(root, "server"),
    env: { ...process.env, GOWORK: "off" },
    stdio: "inherit",
  });
  if (compiled.status !== 0) throw new Error("Go playground build failed.");
  const child = spawn(
    binary,
    ["--port", port, "--public-dir", resolve(root, "dist")],
    { cwd: root, env: process.env, stdio: "inherit" },
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => child.kill(signal));
  child.once("error", () => {
    console.error("Could not start the Go playground server.");
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 0;
  });
} catch (error) {
  console.error(`Ads Agent Playground: ${error.message}`);
  process.exitCode = 1;
}

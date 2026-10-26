import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
export async function buildPlayground() {
  await mkdir(resolve(root, "dist"), { recursive: true });
  await build({
    entryPoints: [resolve(root, "src/client.ts")],
    outfile: resolve(root, "dist/client.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: false,
  });
  for (const file of ["index.html", "style.css"])
    await copyFile(resolve(root, file), resolve(root, "dist", file));
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildPlayground();

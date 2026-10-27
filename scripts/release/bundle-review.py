"""Collect the verified SDK artifacts and customer docs; never publish or deploy."""
import hashlib
import json
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = "0.1.0-preview.1"
RELEASE = ROOT / "scripts/release/dist" / VERSION


def main():
    manifest = json.loads((RELEASE / "manifest.json").read_text())
    verification = json.loads((RELEASE / "verification.json").read_text())
    assert manifest["version"] == verification["version"] == VERSION
    assert verification["archivesUnchanged"] is True
    artifacts = []
    for line in (RELEASE / "SHA256SUMS").read_text().splitlines():
        digest, name = line.split("  ", 1)
        path = Path(name)
        assert not path.is_absolute() and ".." not in path.parts
        assert hashlib.sha256((RELEASE / path).read_bytes()).hexdigest() == digest, name
        artifacts.append(path)
    readme = f"""# Ads SDK {VERSION}

This bundle contains the TypeScript client, Go Admin module and integration documentation.

## TypeScript

```sh
pnpm add /path/to/nuva-sdk-{VERSION}.tgz
```

Open `docs/frontend.html` for installation and setup. Use the header language selector for
Chinese or English, then follow the Agent, resource, generation and backend guides.

## Go

With authenticated repository access:

```sh
GOPRIVATE=github.com/Nuva-Lab/ads-sdk go get github.com/Nuva-Lab/ads-sdk/go@v{VERSION}
```

For offline installation from this bundle:

```sh
GOPROXY="file:///absolute/path/to/bundle/go-proxy" GONOPROXY=none GOSUMDB=off go get github.com/Nuva-Lab/ads-sdk/go@v{VERSION}
```

The checksum setting above applies only to that private archive command. Verify the bundle's
checksums first. Open `docs/backend-go.html` for token issuance and Skill management.

## Files

- `nuva-sdk-{VERSION}.tgz`: TypeScript Agent/Store client and optional React entrypoint.
- `nuva-protocol-{VERSION}.tgz`: public protocol types and schemas.
- `go-proxy/`: Go module archive and offline proxy metadata.
- `ads-sdk-source-{VERSION}.tar.gz`: SDK source and build tools.
- `docs/`: HTML guides and TypeScript, React and Go examples.
- `manifest.json`, `SHA256SUMS`, `BUNDLE-SHA256SUMS`: package inventory and file checksums.
- `verification.json`: package installation checks.

## Playground

Extract `ads-sdk-source-{VERSION}.tar.gz`, then run:

```sh
pnpm install --frozen-lockfile
pnpm playground
```

Set `NUVA_CUSTOMER_API_KEY` and `NUVA_EXTERNAL_USER_ID` in `.env` or your environment first.
Open `http://127.0.0.1:8995/`; the local Go backend manages user tokens.

## Formats

The public message protocol and Artifact schemas use version 1. `script.content` is the typed
ScriptPackage v2 representation of a saved Script. Use `videos.generate` with a saved Prompt ID.
"""
    with tempfile.TemporaryDirectory(prefix="ads-sdk-review-") as temporary:
        stage = Path(temporary)
        for path in [*artifacts, Path("SHA256SUMS"), Path("verification.json")]:
            target = stage / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((RELEASE / path).read_bytes())
        with zipfile.ZipFile(ROOT / "docs/customer-sdk-docs.zip") as docs:
            for name in docs.namelist():
                path = Path(name)
                assert not path.is_absolute() and ".." not in path.parts
                target = stage / "docs" / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(docs.read(name))
        (stage / "README.md").write_text(readme)
        checksums = [
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(stage).as_posix()}"
            for path in sorted(stage.rglob("*")) if path.is_file()
        ]
        (stage / "BUNDLE-SHA256SUMS").write_text("\n".join(checksums) + "\n")
        destination = RELEASE / f"ads-sdk-review-{VERSION}.zip"
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as output:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    info = zipfile.ZipInfo(path.relative_to(stage).as_posix(), (2026, 10, 26, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o100644 << 16
                    output.writestr(info, path.read_bytes())
        print(json.dumps({"bundle": str(destination), "files": len(checksums) + 1,
                          "bytes": destination.stat().st_size,
                          "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()}))


if __name__ == "__main__":
    main()

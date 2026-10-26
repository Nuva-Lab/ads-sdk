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
    readme = f"""# Ads SDK 0.1 preview — review bundle

Version: {VERSION} (Go tag v{VERSION}).

This is a review bundle, not proof of registry publication or hosted Agent release. Inspect manifest.json for service-origin configuration and confirm approved service origins and customer access with your Nuva contact before sending a final customer release. No service credentials or internal handoff documents are included.

## Contents

- nuva-sdk-{VERSION}.tgz — client Agent/Store SDK and optional React entrypoint.
- nuva-protocol-{VERSION}.tgz — matching public protocol dependency.
- go-proxy/ — exact versioned Go Admin module zip/mod/info and local proxy layout.
- ads-sdk-source-{VERSION}.tar.gz — allowlisted SDK sources and build tooling.
- docs/frontend.html, docs/store.html, docs/backend-go.html — customer reference and examples.
- manifest.json, SHA256SUMS, verification.json — inventories, hashes and consumer evidence.
- BUNDLE-SHA256SUMS — checksums for all files in this bundle.

## Install the exact TypeScript archives

From the customer application directory:

```sh
pnpm add /absolute/path/nuva-sdk-{VERSION}.tgz
```

When manifest.json reports unconfigured Agent/generation origins, the preview requires explicit approved endpoint overrides. The intended released constructor needs only getAccessToken after verified service origins are baked into the package. A localhost URL is not a customer service. Repack and rerun the exact-archive checks once origins are approved.

## Install the exact Go module archive

From the customer Go application directory:

```sh
GOPROXY="file:///absolute/path/to/bundle/go-proxy,https://proxy.golang.org,direct" GONOSUMDB=github.com/Nuva-Lab/ads-sdk/go go get github.com/Nuva-Lab/ads-sdk/go@v{VERSION}
```

This uses the supplied versioned module proxy. It needs neither a replace directive nor access to an unpublished repository. The private repository also supports authenticated Go installation through its go/v* tags.

## Version boundaries

Public wire revision and resource API/schema versions are 1. ScriptPackage version 2 remains inside script@1.data.text; existing data is not renumbered. Raw-input video submission and generic Artifact relationships require a coordinated backend/SDK update and are not exposed by this preview. Current video generation uses a saved Prompt ID.
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

# Ads SDK

Private client and Admin SDKs for authorized Nuva integrations. This repository contains the SDK implementation, public protocol, documentation, examples and local release tooling. Access to this repository does not issue service credentials or grant access to customer data.

Current preview: **0.1.0-preview.3**. Public API/wire/Artifact schemas remain **v1**; the structured ScriptPackage remains **v2** inside `script@1.data.text`.

## Repository

| Directory | Contents |
| --- | --- |
| `typescript/` | `@nuva/sdk`: Agent and Store clients, with optional `@nuva/sdk/react` integration |
| `protocol/` | `@nuva/protocol`: public messages, types and validators |
| `go/` | `github.com/Nuva-Lab/ads-sdk/go`: Admin client for customer-backend use |
| `docs/` | Customer reference builders and `examples/` for TypeScript, React and Go |
| `scripts/release/` | Versioned archives, checksum inventories and clean-consumer checks |

The Agent runtime, backend, private Skills, credentials and local test sessions are not included. npm publication is disabled by the package manifests; distribution uses this private repository's Releases.

## Install a preview

Download the matching review ZIP from [Releases](https://github.com/Nuva-Lab/ads-sdk/releases), verify `BUNDLE-SHA256SUMS`, and extract it. The first release is a draft pending maintainer review.

From a customer JavaScript application directory:

```sh
npm install /absolute/path/nuva-protocol-0.1.0-preview.3.tgz /absolute/path/nuva-sdk-0.1.0-preview.3.tgz
```

Both tarballs are needed when no npm registry hosts the protocol dependency. The installed SDK is used normally:

```ts
import { createNuva, Message } from '@nuva/sdk';
```

For Go, first configure Git authentication for an account with repository read access (for example, `gh auth login` followed by `gh auth setup-git`). Then use a command-scoped private module setting:

```sh
GOPRIVATE=github.com/Nuva-Lab/ads-sdk go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.3
```

Because the module lives in `go/`, the corresponding repository tag is **`go/v0.1.0-preview.3`**. The overall SDK release tag is `v0.1.0-preview.3`. Keep both tags on the same reviewed commit. The review ZIP also contains an offline Go module proxy, with installation instructions inside.

## Current service compatibility

This initial repository packages the existing preview SDK. Approved Agent/generation service origins still need to be configured for customer delivery; the current bundle requires explicit endpoint overrides. Creating this repository does not deploy a service. See [TypeScript usage](typescript/README.md) and [Go usage](go/README.md).

Video submission currently uses a saved Prompt ID. New backend raw-input and generic Artifact-relationship contracts require coordinated SDK/backend adoption before they become this SDK's public interface. Batch and Ad writes are Agent-only. Customer workflows use direct Script, Prompt, video and assembly operations; they cannot register arbitrary executable workflows.

## Build and verify

Use Node 22+, pnpm 11.7.0, Python 3 and Go 1.22+.

```sh
pnpm install --frozen-lockfile
pnpm verify
```

This runs protocol/client/Go tests, builds the customer docs, checks TypeScript examples, builds versioned archives, and installs the exact archives into fresh TypeScript/React/Go consumer projects. It makes no model, media-generation or service calls. Dependency installation may access package registries.

```sh
pnpm docs:build
python3 -m http.server 8992 --bind 127.0.0.1 --directory docs/customer
```

Open `http://127.0.0.1:8992/frontend.html`. Choose another port if it is already in use.

Build outputs are ignored by Git. Archives appear under `scripts/release/dist/0.1.0-preview.3/`. The full Git checkout contains tests and docs; the smaller SDK source archive includes the files needed to reproduce package builds.

## Release process

See [RELEASING.md](RELEASING.md). CI verifies code on pushes and pull requests. The manual release workflow creates a **draft prerelease** only, from an existing reviewed release tag. There is no npm publish or application deployment workflow. Repository collaborators and customer access are managed separately by maintainers.

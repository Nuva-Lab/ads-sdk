# Private preview releases

1. Update the package versions in root, `typescript/package.json` and `protocol/package.json`, the Go `Version` constant, and the version used by `scripts/release/common.mjs` and `bundle-review.py`. Update versioned examples. Public schema revisions are independent.
2. Run `pnpm install --frozen-lockfile` and `pnpm verify` from a clean checkout. Review the generated `manifest.json`, `SHA256SUMS` and `verification.json`.
3. Confirm service compatibility. An archive with unconfigured Agent/generation origins is a review candidate, not a configured customer release. To bake approved origins, run `node scripts/release/build.mjs --origins approved-origins.json`, then `pnpm release:check` and `pnpm release:bundle`. The JSON contains only approved service URLs, never credentials.
4. Commit the reviewed sources. Tag that same commit as `v0.1.0-preview.4` and `go/v0.1.0-preview.4` (using the version being released). The Go subdirectory tag is necessary for normal Go module resolution.
5. Create a draft prerelease with the review ZIP, both npm tarballs, SDK source tarball, customer docs ZIP, manifest, checksums and consumer verification. The review ZIP includes the Go module proxy. The manual **Preview release** workflow performs the default, unconfigured-origin build; a configured build must be separately reviewed and attached without silently replacing a published version.
6. Inspect the draft before publishing it to repository readers. Never overwrite an already published version: increment the preview version for a changed package. Publishing a repository release does not publish npm packages or deploy any services.

## Manual local release preparation

```sh
pnpm verify
node --test scripts/release/release.test.mjs
```

The first private preview uses `0.1.0-preview.4`. Its new Go module path is `github.com/Nuva-Lab/ads-sdk/go`. Older WhatIf-local archives used a proposed `nuva-admin-go` path; use the new repository's matching archives for this module.

## Access and credentials

Repository readers need GitHub authentication to download private assets or resolve the Go module. Give customers only the access their integration needs. Do not embed GitHub access tokens, Nuva user tokens, Admin API keys, signed media URLs or private runtime data in packages or examples. Private packages still deliver implementation code to authorized recipients.

GitHub Actions availability depends on the organization's account status and usage limits. Local `pnpm verify` is available when hosted CI cannot run; report that distinction in release notes instead of claiming hosted CI passed.

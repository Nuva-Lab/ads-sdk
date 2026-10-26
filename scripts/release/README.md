# Build release packages

Run these commands from the repository root:

```sh
pnpm verify
node --test scripts/release/release.test.mjs
```

Outputs are written to `scripts/release/dist/0.1.0-preview.1/`. The client tarball bundles its
matching protocol dependency. The Go module archive includes the complete module tree so its
checksum matches a download from the repository tag.

To configure default service URLs in a distribution, provide an origins file with `agent`,
`generation` and `store` HTTPS URLs:

```sh
node scripts/release/build.mjs --origins origins.json
pnpm release:check
pnpm release:bundle
```

Package versions must match in the root, TypeScript and protocol manifests, the Go `Version`
constant, and the release scripts. The repository tags `v0.1.0-preview.1` and
`go/v0.1.0-preview.1` identify the same source commit. The latter is needed for the Go submodule.

Keep the chosen version while preparing an unpublished draft. Increment for the next issued
release. Check the service configuration, examples, archive checksums and consumer verification
before publishing a draft.

# Nuva Go Admin SDK — v0.1.0-preview.4

This standalone Go module implements customer token issuance and Skill registration/read APIs. It uses only the Go standard library and Go 1.22+. `github.com/Nuva-Lab/ads-sdk/go` is the module path in this private SDK repository. Go versions resolve through `go/v*` repository tags; repository read access is required. Local packaging is independently checked without importing the Agent runtime or TypeScript source.

The Admin API key stays in the customer backend. A separate `UserClient` accepts an issued user token for Skill reads because the observed backend does not authorize those data routes using an Admin API key. Neither client follows redirects or retries requests automatically.

```go
import (
    "context"
    "os"
    nuva "github.com/Nuva-Lab/ads-sdk/go"
)

admin, err := nuva.NewAdminClient(backendURL, os.Getenv("NUVA_CUSTOMER_API_KEY"))
if err != nil { /* handle configuration error */ }
// authenticatedUserID comes from your verified customer session.
token, err := admin.IssueUserToken(context.Background(), authenticatedUserID)
// Return token.AccessToken and token.ExpiresAt to that same user's browser.

registered, err := admin.RegisterSkill(ctx, "product-writer", nuva.SkillRegistration{
    Files: map[string]string{"SKILL.md": "# Product writer\nUse supplied product facts."},
    Attributes: map[string]any{"preload": []string{}},
})
// Registration retains the backend's returned IDs. It does not execute customer code.
_, err = admin.SetSkillMain(ctx, "product-writer", registered.Version.Version)

reader, err := nuva.NewUserClient(backendURL, token.AccessToken)
version, err := reader.GetSkillVersion(ctx, registered.Skill.ID, registered.Version.Version)
```

Handle every error in application code; the abbreviated example omits application-specific HTTP/session handling. `IssueUserToken` is POST `/v1/admin/tokens` with `{external_user_id}` and retains `access_token`, `expires_at` and the actual returned user identity. Backend tokens last one hour in the observed source. The customer token endpoint can return `{token: token.AccessToken, expiresAt: token.ExpiresAt}`; Go JSON encodes the time as an ISO datetime accepted by the TypeScript SDK. Never derive the requested identity from an unverified browser parameter.

| Go method | Observed backend route | Credential |
| --- | --- | --- |
| `AdminClient.IssueUserToken(ctx, externalUserID)` | POST `/v1/admin/tokens` | Customer API key as Bearer |
| `AdminClient.RegisterSkill(ctx, name, input)` | PUT `/v1/admin/skills/{name}` | Customer API key |
| `AdminClient.SetSkillMain(ctx, name, version)` | PUT `/v1/admin/skills/{name}/main` | Customer API key |
| `UserClient.ListSkills(ctx, ListOptions)` | GET `/v1/skills` | Issued user token |
| `UserClient.GetSkill(ctx, id)` | GET `/v1/skills/{id}` | Issued user token |
| `UserClient.GetSkillVersion(ctx, id, version)` | GET `/v1/skills/{id}/versions/{version}` | Issued user token |

Registration validates the required `SKILL.md`, path/name rules, UTF-8, file count and size limits, attributes and source provenance before dispatch. Responses retain nullable description/note/source/main fields, file hashes, download URLs, expiry and arbitrary attributes. Attribute numbers use `json.Number` so generic JSON does not lose integer precision. Definition publication is distinct from activation: registering later versions does not implicitly move `main`.

## Error and transport contract

Every method takes a context. Default HTTP timeout is 30 seconds; `WithHTTPClient` copies a caller-supplied client while preserving redirect refusal. Provide bounded contexts when supplying an HTTP client with no timeout. The SDK never follows a credential-bearing request to another URL.

`*APIError` retains HTTP status for backend rejection envelopes, backend code, retryability, safe request ID/details and write acceptance. StatusCode is zero for local validation/transport and post-decode contract failures where the SDK does not expose a backend rejection response. Postdispatch network errors, HTTP 5xx/408, redirects without a valid envelope and malformed success/error responses retain `Acceptance == "unknown"` for writes. An expired/rejected credential is not silently replaced, and no request is replayed. Inspect state before explicitly retrying uncertain operations. Context cancellation remains discoverable through `errors.Is(err, context.Canceled)` or `context.DeadlineExceeded`.

Errors do not include raw response bodies or transport errors, and echoed current credentials are redacted. Client formatting redacts credentials. Token responses deliberately expose the issued user token to the calling backend; do not log those response objects. The Go reader does not auto-renew user tokens—issue a fresh token and construct a reader for the same user when needed.

## Pseudocode and choices

```text
validate input and context
marshal only the supported request DTO
send once to configured backend, using this client's credential type
refuse redirects; bound response bytes
on error: retain safe structured fields and uncertain-write classification
on success: decode typed records, validate identity/version, preserve nulls and metadata
return records; never publish/activate additional versions automatically
```

Separate Admin/User client types make wrong-credential routing reviewable. Standard `net/http`, `context` and JSON keep the module independent of the Agent implementation. The observed backend remains the authority for permissions and registration deduplication. Delegated Agent credentials and Batch/Ad mutations are not customer Admin SDK methods.

## Local verification and distribution

```sh
GOTOOLCHAIN=local go test -race ./...
sh scripts/check-package.sh
```

The release bundle contains the versioned Go zip and a local module proxy. A fresh consumer can install the delivered module without a repository or a local source replacement:

```sh
GOPROXY=file:///absolute/path/to/release/go-proxy GOSUMDB=off \
  go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.4
```

`GOSUMDB=off` is scoped to this explicitly supplied unpublished local bundle; verify `SHA256SUMS` before using it. It is not guidance for disabling verification of ordinary published modules. `node scripts/release/check.mjs <release-directory>` tests the exact zip from that proxy in a new module cache and checks that no `replace` or source-copy shortcut is used.

No module repository or registry release is created by these commands. No tests call a model, provider or live backend.

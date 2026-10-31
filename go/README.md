# Go Admin SDK (v0.1.0-preview.2)

Use the Go Admin SDK on your backend to issue user tokens, register Skills and select their main versions. It requires Go 1.22+ and uses the Go standard library.

```sh
go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.2
```

`AdminClient` uses your customer Admin API key. `UserClient` uses an issued user token for Skill reads. Keep the Admin key on your backend.

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

Handle every error in application code; the abbreviated example omits application-specific HTTP/session handling. `IssueUserToken` is POST `/v1/admin/tokens` with `{external_user_id}` and retains `access_token`, `expires_at` and the actual returned user identity. User tokens expire after one hour; use the returned `ExpiresAt` value. The customer token endpoint can return `{token: token.AccessToken, expiresAt: token.ExpiresAt}`; Go JSON encodes the time as an ISO datetime accepted by the TypeScript SDK. Never derive the requested identity from an unverified browser parameter.

| Go method | API route | Credential |
| --- | --- | --- |
| `AdminClient.IssueUserToken(ctx, externalUserID)` | POST `/v1/admin/tokens` | Customer API key as Bearer |
| `AdminClient.RegisterSkill(ctx, name, input)` | PUT `/v1/admin/skills/{name}` | Customer API key |
| `AdminClient.SetSkillMain(ctx, name, version)` | PUT `/v1/admin/skills/{name}/main` | Customer API key |
| `UserClient.ListSkills(ctx, ListOptions)` | GET `/v1/skills` | Issued user token |
| `UserClient.GetSkill(ctx, id)` | GET `/v1/skills/{id}` | Issued user token |
| `UserClient.GetSkillVersion(ctx, id, version)` | GET `/v1/skills/{id}/versions/{version}` | Issued user token |

Registration validates the required `SKILL.md`, path/name rules, UTF-8, file count and size limits, attributes and source provenance before dispatch. For Skills used by the writer, every file must use one of its supported extensions: `.md`, `.txt`, `.json`, `.yaml` or `.yml`. The writer checks every file in the version, including files outside `attributes.preload`; registration alone does not establish writer compatibility.

Responses retain nullable description/note/source/main fields, file hashes, download URLs, expiry and arbitrary attributes. Attribute numbers use `json.Number` so generic JSON does not lose integer precision. The first registered version becomes `main`; later registrations do not implicitly move `main`.

## Error and transport contract

Every method takes a context. Default HTTP timeout is 30 seconds; `WithHTTPClient` copies a caller-supplied client while preserving redirect refusal. Provide bounded contexts when supplying an HTTP client with no timeout. The SDK never follows a credential-bearing request to another URL.

`*APIError` retains HTTP status for backend rejection envelopes, backend code, retryability, safe request ID/details and write acceptance. StatusCode is zero for local validation/transport and post-decode contract failures where the SDK does not expose a backend rejection response. Postdispatch network errors, HTTP 5xx/408, redirects without a valid envelope and malformed success/error responses retain `Acceptance == "unknown"` for writes. An expired/rejected credential is not silently replaced, and no request is replayed. Inspect state before explicitly retrying uncertain operations. Context cancellation remains discoverable through `errors.Is(err, context.Canceled)` or `context.DeadlineExceeded`.

Errors do not include raw response bodies or transport errors, and echoed current credentials are redacted. Client formatting redacts credentials. Token responses deliberately expose the issued user token to the calling backend; do not log those response objects. The Go reader does not auto-renew user tokens; issue a fresh token and construct a reader for the same user when needed.

## Local verification

From the `go/` directory in the full Git checkout:

```sh
GOTOOLCHAIN=local go test -race ./...
sh scripts/check-package.sh
```

For offline installation, verify the bundle checksums and use its included Go module proxy:

```sh
GOPROXY=file:///absolute/path/to/release/go-proxy GONOPROXY=none GOSUMDB=off \
  go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.2
```

`GONOPROXY=none` ensures this command uses the included proxy even if you have configured `GOPRIVATE`. `GOSUMDB=off` applies only to this command for the supplied module archive. Verify `SHA256SUMS` before installing.

Tests use local HTTP fixtures.

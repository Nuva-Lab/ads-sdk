# Go Admin SDK (v0.1.0-preview.6)

Use the Go Admin SDK on your backend to issue user tokens, organize your users into orgs and groups, name their admins, share items, register Skills and select their main versions. It requires Go 1.22+ and uses the Go standard library.

```sh
go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.6
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
| `AdminClient.PutScope(ctx, externalID, ScopeInput)` | PUT `/v1/admin/scopes/{external_id}` | Customer API key |
| `AdminClient.ListScopes(ctx, ListOptions)` | GET `/v1/admin/scopes` | Customer API key |
| `AdminClient.ArchiveScope(ctx, externalID)` | DELETE `/v1/admin/scopes/{external_id}` | Customer API key |
| `AdminClient.SetMemberships(ctx, externalUserID, memberships)` | PUT `/v1/admin/users/{external_user_id}/memberships` | Customer API key |
| `AdminClient.GetMemberships(ctx, externalUserID)` | GET `/v1/admin/users/{external_user_id}/memberships` | Customer API key |
| `AdminClient.ListShares(ctx, ItemRef)` | GET `/v1/shares/{kind}/{id}` | Customer API key |
| `AdminClient.SetShare(ctx, ItemRef, scope, access)` | PUT `/v1/shares/{kind}/{id}/{scope}` | Customer API key |
| `AdminClient.RemoveShare(ctx, ItemRef, scope)` | DELETE `/v1/shares/{kind}/{id}/{scope}` | Customer API key |
| `UserClient.ListSkills(ctx, ListOptions)` | GET `/v1/skills` | Issued user token |
| `UserClient.GetSkill(ctx, id)` | GET `/v1/skills/{id}` | Issued user token |
| `UserClient.GetSkillVersion(ctx, id, version)` | GET `/v1/skills/{id}/versions/{version}` | Issued user token |

Registration validates the required `SKILL.md`, path/name rules, UTF-8, file count and size limits, attributes and source provenance before dispatch. For Skills used by the writer, every file must use one of its supported extensions: `.md`, `.txt`, `.json`, `.yaml` or `.yml`. The writer checks every file in the version, including files outside `attributes.preload`; registration alone does not establish writer compatibility.

Responses retain nullable description/note/source/main fields, file hashes, download URLs, expiry and arbitrary attributes. Attribute numbers use `json.Number` so generic JSON does not lose integer precision. The first registered version becomes `main`; later registrations do not implicitly move `main`.

## Orgs, groups, admins and shares

New Brands, Products, Characters, Assets and Artifacts belong to the user who made them. They are private to that user, and to the admins above them, unless they are shared. Your customer may be set to share new Brands, Products and Characters with everyone automatically. Put your users into scopes, name admins, and share items with a scope:

```go
_, err = admin.PutScope(ctx, "agency-a", nuva.ScopeInput{Kind: nuva.ScopeOrg})
parent := "agency-a"
_, err = admin.PutScope(ctx, "team-1", nuva.ScopeInput{Kind: nuva.ScopeGroup, Parent: &parent})
// Replaces the user's memberships. "customer" is the root: an admin there administers everyone.
_, err = admin.SetMemberships(ctx, "lead@example.com", []nuva.Membership{{Scope: "agency-a", Role: nuva.RoleAdmin}})
_, err = admin.SetMemberships(ctx, "maker@example.com", []nuva.Membership{{Scope: "team-1", Role: nuva.RoleMember}})
// Everyone in team-1 may read the Product and use it in their own content.
_, err = admin.SetShare(ctx, nuva.ItemRef{Kind: "product", ID: productID}, "team-1", nuva.AccessRead)
```

- **`RoleMember`** reads what is shared with its scope or a scope above it. Every user is a member of `customer` without a row.
- **`RoleAdmin`** reads, writes, deletes and shares what users at or below its scope own, and can drive their Agent Sessions.
- **`RoleViewer`** reads what users at or below its scope own, and changes nothing of theirs. A viewer is still a member: an item shared with them for writing, they can edit.
- **Shares** are `AccessRead` (see and use) or `AccessWrite` (also edit). A share reaches everyone at or below its scope. It never allows deleting the item or sharing it on.
- Shareable kinds are `brand`, `product`, `character`, `asset`, `script`, `storyboard`, `directing_plan` and `prompt`.
- The API key administers the whole customer: it lists, reads and shares everyone's items, but writing items takes a user token.
- `ListShares` takes the right to share the item (the API key, its owner or an admin above them).
- Memberships take effect at once for the API; the Agent follows within a minute for Session access. A scope or user external ID can't contain `/` or be `.` or `..`.

## Error and transport contract

Every method takes a context. Default HTTP timeout is 30 seconds; `WithHTTPClient` copies a caller-supplied client while preserving redirect refusal. Provide bounded contexts when supplying an HTTP client with no timeout. The SDK never follows a credential-bearing request to another URL.

`*APIError` carries the HTTP status of a backend rejection, the backend code, `Retryable`, the request ID and validation details. StatusCode is zero for local validation, transport and post-decode contract failures. Every Admin write repeats to the same result (scopes, memberships and shares are replaced; registering the same Skill content returns the same version), so retrying a `Retryable` error is safe. An expired or rejected credential is not silently replaced, and no request is replayed by the SDK. Context cancellation remains discoverable through `errors.Is(err, context.Canceled)` or `context.DeadlineExceeded`.

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
  go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.6
```

`GONOPROXY=none` ensures this command uses the included proxy even if you have configured `GOPRIVATE`. `GOSUMDB=off` applies only to this command for the supplied module archive. Verify `SHA256SUMS` before installing.

Tests use local HTTP fixtures.

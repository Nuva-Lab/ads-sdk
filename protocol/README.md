# Nuva client protocol

`@nuva/protocol@0.1.0-preview.3` defines the client-visible Agent API contract: resource/message references, public messages and content parts, client input, client-tool calls/responses, Session state, pagination, public errors and transport envelopes. It also provides their runtime validation schemas.

The TypeScript SDK, gateway and Agent runtime consume this package. The SDK re-exports the public types, so applications can keep importing them from `@nuva/sdk`. This package depends on Zod; it has no React, SDK, agent-framework or model-provider dependency.

```text
Client SDK  ← public protocol →  Gateway  ← private adapter →  Agent runtime
```

The package does not define raw model transcripts, internal tool results, reasoning, provider metadata or private execution traces. Those formats belong to runtime-specific gateway adapters. Public schemas are not a promise that raw agent objects are safe to serialize.

## Gateway obligations

- Validate client input and establish actor/permissions on the server. Clients cannot submit system/developer roles, internal tool invocations or trusted author metadata.
- Resolve resource references and call bindings within authorized scope before materializing agent input. A public call ID maps to a private runtime call record; clients do not select internal tool IDs.
- Construct outgoing DTOs from explicitly published text, authorized resources and registered client interactions. Internal tools/results and reasoning have no public representation.
- A registered client tool such as a review remains public. Validate its input/output against its server-owned definition; a tool name or model-supplied visibility flag alone does not make it public.
- Apply the same public projection to live events, reads, history and replay before serialization. Filtering only in the SDK is too late because the raw data would already cross the boundary.
- Convert unexpected internal failures to safe public errors with correlation IDs. Never forward a raw exception, stack or provider response.

Allowlisting controls structured publication. It does not automatically redact private information that application code deliberately places in published text or a permitted tool field. The runtime must select the appropriate publication channel and contents.

## Renewable socket authentication

Protocol revision 1 now includes additive `clientReauthFrameSchema` support:

```text
client: {type: "reauth", id: "reauth-...", token: "<renewed user token>"}
server: {type: "reauthenticated", id: "reauth-..."}
failure: existing error envelope with the same id, followed by socket close
```

Initial `auth` / `ready` behavior is unchanged. The gateway must verify issuer, audience, expiry and the exact existing customer/user, then reauthorize subscriptions before replacing the credential and acknowledging. A client-provided identity or role is never authoritative. New business commands wait for the matching acknowledgement; accepted work and already-sent commands are not replayed. Authentication traces redact tokens. A malformed/mismatched acknowledgement or failed renewal closes the connection without account switching. These are Agent protocol requirements, separate from backend REST and delegated Agent credentials.

## Development and distribution

This package, the SDK and the mock gateway are pnpm workspace members under `agents/ads-agent`. Use the workspace lockfile:

```sh
pnpm --dir agents/ads-agent --filter @nuva/sdk-mock-server... install --ignore-scripts --frozen-lockfile
pnpm --dir agents/ads-agent/protocol test
```

This release aligns the npm package version with the SDK at `0.1.0-preview.3`; this does not renumber wire or stored-data schemas. `CLIENT_PROTOCOL_REVISION` is `1`. All public transport envelopes—request, authentication, reauthentication, ready, result, error and state—accept optional `version: 1`. Omitting it preserves the original implicit v1 contract. An explicitly different version, including a string such as `"1"`, is rejected by runtime validation. This rule applies to both inbound gateway requests and outbound frames decoded by the SDK; unknown versions cannot be silently discarded as extra metadata. This is version validation, not automatic negotiation or downgrade. The current SDK continues sending the compatible unversioned form.

```ts
requestFrameSchema.parse({ version: 1, id: 'read-1', method: 'sessions.history', params: { sessionId: 'session-1' } });
requestFrameSchema.parse({ id: 'read-1', method: 'sessions.history', params: { sessionId: 'session-1' } }); // Also v1.
```

Artifact `schemaVersion` describes its content and is separate from envelope `version` and npm package versions. An unsupported Artifact codec can fail while an authorized generic read still returns the raw content under a supported envelope.

SDK packages pin this exact protocol release when packed. Install the two delivered npm tarballs together; no registry publication is implied:

```sh
npm install /path/to/nuva-protocol-0.1.0-preview.3.tgz /path/to/nuva-sdk-0.1.0-preview.3.tgz
```

The release manifest and checksums identify the exact delivered files. Independent consumer checks exercise those archives rather than workspace links.

## Scope

Protocol schemas define supported public messages and validation, not backend deployment status. `StopReceipt` addresses the current chat loop and does not imply Job cancellation. Host service capability and authorization still apply. Raw model transcripts, provider reasoning and private creation traces are outside this package's public message contract.

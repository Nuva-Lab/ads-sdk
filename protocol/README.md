# Public message protocol

`@nuva/protocol@0.1.0-preview.1` provides TypeScript types and Zod schemas for Agent messages, resource references, client interactions, Session state and API envelopes.

The client SDK includes this package and re-exports the types most applications need. Install it separately only when importing protocol schemas directly:

```sh
pnpm add /path/to/nuva-protocol-0.1.0-preview.1.tgz
```

## Validate messages

```ts
import { messageSchema, resourceRefSchema } from '@nuva/protocol';

const resource = resourceRefSchema.parse({ kind: 'script', id: scriptId });
const message = messageSchema.parse(receivedMessage);
```

Messages contain text, quoted content, resource records and application interactions. Render content in order and use each resource's `{kind, id}` reference to retrieve it. User display names are optional; `userId` identifies the author.

Client tools in the `input-available` state need a response through `agent.respond()` or `agent.fail()`. Host actions, such as navigation, do not need a response. Both can appear in saved history, so an application should not repeat actions merely because it renders an older message.

## Versioning

The package version is `0.1.0-preview.1`; `CLIENT_PROTOCOL_REVISION` is `1`. Public envelopes accept either an omitted version or `version: 1`. Other explicit versions are rejected.

```ts
import { requestFrameSchema } from '@nuva/protocol';

requestFrameSchema.parse({
  version: 1,
  id: 'read-1',
  method: 'sessions.history',
  params: { sessionId: 'session-1' },
});
```

Artifact `schemaVersion` identifies its content format separately from the message envelope version. The SDK's Script reader exposes ScriptPackage v2 through `script.content`; the stored Script Artifact uses schema v1.

## Authentication and Session behavior

The SDK handles initial socket authentication and token renewal. Renewals must retain the same user identity. Close the client and create another when switching accounts.

A successful Send receipt acknowledges the input. Subscribe to receive the subsequent response and resource records. Stop ends the current chat loop and its unanswered interactions; it does not cancel separately submitted video Jobs.

## Development

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --dir protocol test
```

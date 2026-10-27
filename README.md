# Ads SDK

Build ad creation into your application with Agent chat, product and media management, Script and Prompt generation, and video Jobs.

**Preview version: `0.1.0-preview.1`**

- **TypeScript client:** connect your frontend to Ads Agent and work with saved resources. Includes React hooks.
- **Go Admin SDK:** issue user tokens and manage Skills from your backend.
- **Playground:** try the creation flow locally with a visual workspace and Agent chat.

## Try the playground

You need Node.js 22+, pnpm 11.7.0, Go 1.22+, and a customer Admin API key.

From this repository:

```sh
pnpm install --frozen-lockfile
cp ads-agent-playground/.env.example .env
```

Set your credentials in `.env`:

```dotenv
NUVA_CUSTOMER_API_KEY=your-customer-admin-api-key
NUVA_EXTERNAL_USER_ID=your-test-user-id
```

Use the user ID from your own application. The local Go server issues and refreshes that user's access token; the Admin key stays on the server.

The playground uses the staging services by default. Start it with:

```sh
pnpm playground
```

Open **http://127.0.0.1:8995/**.

Create a Product and upload its reference images, then mention it with **@** in chat and ask Ads Agent to write a Script. Review the Script, Prompt references and generated clips in the workspace. The interface defaults to Chinese; use **中文 / English** in the header to switch.

See the [playground guide](ads-agent-playground/README.md) for setup, controls and troubleshooting.
Follow the [manual test guide](ads-agent-playground/TESTING.md) to check the full creation flow and your own integration.

## Add the SDK to your application

### TypeScript

Install the package from your SDK bundle:

```sh
pnpm add /path/to/nuva-sdk-0.1.0-preview.1.tgz
```

Configure a client with a `getAccessToken` callback that calls your authenticated backend. The preview uses the staging services by default. Return `{token, expiresAt}` so the SDK can refresh access when needed.

Start with the [TypeScript guide](typescript/README.md) or [React example](docs/examples/react-usage.tsx).

### Go

Authenticate Git with an account that has access to this repository, then install:

```sh
GOPRIVATE=github.com/Nuva-Lab/ads-sdk go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.1
```

Use the [Go Admin SDK](go/README.md) to issue user tokens and register Skills. Your backend holds the Admin API key and returns a user token to the signed-in user's frontend.

## Guides and examples

| I want to… | Start here |
| --- | --- |
| Connect a client and handle authentication | [TypeScript guide](typescript/README.md) |
| Build Agent chat, stream replies and handle reviews | [React example](docs/examples/react-usage.tsx) |
| Create Products, upload images and read saved artifacts | [Store examples](docs/examples/store-usage.ts) |
| Generate Scripts, Prompts and video clips | [Creation example](docs/examples/creation-chain.ts) |
| Issue user tokens and manage Skills | [Go Admin guide](go/README.md) |

The SDK bundle includes browsable HTML documentation. To view it from this repository, install Python 3 and run:

```sh
pnpm docs:build
python3 -m http.server 8992 --bind 127.0.0.1 --directory docs/customer
```

Open **http://127.0.0.1:8992/frontend.html**. The sidebar links to the Agent, Store and Go Admin references.

## Build and test

```sh
pnpm build
pnpm test
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

Tests use local fixtures. Running generation through the playground uses your connected services and creates real work.

For integration problems, [open an issue](https://github.com/Nuva-Lab/ads-sdk/issues) with the SDK version and steps to reproduce.

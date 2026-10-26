# Ads SDK

Add ad creation and Agent chat to your application. The TypeScript SDK manages products and media, writes Scripts and clip Prompts, generates videos, and assembles clips. The Go Admin SDK lets your backend issue user tokens and manage Skills.

Version: **0.1.0-preview.1**.

## TypeScript

Download the SDK bundle provided for your integration, then install the client package:

```sh
pnpm add /path/to/nuva-sdk-0.1.0-preview.1.tgz
```

Start with the [TypeScript guide](typescript/README.md), [React examples](docs/examples/react-usage.tsx), or the [complete creation example](docs/examples/creation-chain.ts).

## Go

Authenticate Git with an account that has access to this private repository, then install:

```sh
GOPRIVATE=github.com/Nuva-Lab/ads-sdk go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.1
```

See the [Go Admin guide](go/README.md) for user-token issuance and Skill management. Keep your Admin API key on your backend; the browser SDK uses user tokens.

## Try the playground

```sh
pnpm install
cp ads-agent-playground/.env.example .env
```

Set the two required values in `.env`, then run `pnpm playground`. See the playground guide for details. Open `http://127.0.0.1:8995/` to explore products and saved work,
chat with the Agent, and mention resources with **@**. See the [playground guide](ads-agent-playground/README.md).

## Guides and examples

| Task | Guide |
| --- | --- |
| Connect the client and handle authentication | [TypeScript SDK](typescript/README.md) |
| Build an Agent chat interface | [React examples](docs/examples/react-usage.tsx) |
| Create products, upload media, and read saved work | [Store examples](docs/examples/store-usage.ts) |
| Generate a Script, clip Prompts, videos, and an assembly | [Creation example](docs/examples/creation-chain.ts) |
| Issue user tokens and manage Skills | [Go Admin SDK](go/README.md) |
| Read public message types and validation schemas | [Protocol package](protocol/README.md) |

The SDK bundle includes browsable HTML documentation under `docs/`. [GitHub Releases](https://github.com/Nuva-Lab/ads-sdk/releases) also lists release packages available to your account.

## Build from source

Use Node 22+, pnpm 11.7.0, Python 3 and Go 1.22+.

```sh
pnpm install --frozen-lockfile
pnpm verify
```

To view the documentation locally:

```sh
pnpm docs:build
python3 -m http.server 8992 --bind 127.0.0.1 --directory docs/customer
```

Open `http://127.0.0.1:8992/frontend.html`. Tests use local fixtures and do not submit generation work.

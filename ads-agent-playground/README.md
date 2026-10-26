# Ads Agent Playground

Explore your products, scripts, prompts and videos alongside an Agent conversation.

From the SDK repository:

```sh
pnpm install
pnpm playground
```

Open **http://127.0.0.1:8995/**, select **Connect**, and paste your user token and the service URLs supplied for your environment. The token stays in memory while the page is open. To replace an expired token, open Connect again.

- Use **@** to mention a product or a saved resource inline.
- Press **Enter** to send, or **Shift + Enter** for a new line.
- Use arrow keys and Enter to choose a mention; Escape closes the list.
- Create or edit products and upload reference images in the workspace.
- Open saved Scripts, Prompts, clips and final videos from their workspace tabs.
- Use the **+** button for a new conversation. Earlier messages and refresh are in the conversation menu.
- **Stop** ends the current Agent loop. Video Jobs have a separate cancellation control.

The playground uses your user permissions. Generating scripts or videos creates real work when connected to your services. Closing the page does not cancel work already submitted.

To use another local port:

```sh
pnpm --dir ads-agent-playground start --port 8997
```

The local host proxies public SDK requests. Your services must allow the playground's browser origin for Agent WebSockets and direct media uploads. The app does not expose the internal status or telemetry pages.

## Local checks

```sh
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

The tests use local fixtures and do not call a live Agent or submit video-generation Jobs.

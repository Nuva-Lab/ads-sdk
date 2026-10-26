# Ads Agent Playground

Explore products, scripts, prompts and videos alongside an Agent conversation.

## Start

Use Node 22+, pnpm, and Go 1.22+. From the SDK repository:

```sh
pnpm install
cp ads-agent-playground/.env.example .env
```

Set these two values in `.env`:

```dotenv
NUVA_CUSTOMER_API_KEY=your-customer-admin-api-key
NUVA_EXTERNAL_USER_ID=your-user-id
```

`NUVA_EXTERNAL_USER_ID` is the user's ID in your own application. The Go backend uses the Admin SDK to issue a user token for that identity. It caches the token, refreshes it before expiry, and serves the playground. The Admin key stays in the backend.

```sh
pnpm playground
```

Open **http://127.0.0.1:8995/**. The workspace connects automatically. Use **Connection settings** to view or edit service URLs for the open page. A new launch uses the environment defaults again. There is no token field in the page.

You can set the variables in your shell instead of using `.env`. Environment variables take precedence over the file. Startup fails with the missing variable names if either required value is absent.

## Service settings

The connection screen starts with the service defaults. Override them at startup when needed:

```dotenv
NUVA_STORE_URL=https://api-staging.nuvalab.ai
NUVA_AGENT_URL=http://127.0.0.1:8980/api
NUVA_GENERATION_URL=http://127.0.0.1:8980
```

Token issuance always uses the server's `NUVA_STORE_URL`; changing a URL in the page never redirects the Admin key. To change the token issuer or user identity, update the environment and restart the playground.

For another file or local port:

```sh
pnpm playground --env-file ./my-playground.env --port 8997
```

## Use the workspace

The interface starts in Chinese. Choose **中文 / English** in the top-right corner to change it; your browser remembers the choice. Switching languages preserves your draft and existing conversation and artifact content. For new replies and creative content, the Agent follows the language of your message, or the output language you explicitly request.

Prompt details show numbered media references inline. Click a reference to preview its image,
video, or audio. Saved generation settings appear beside the prompt text. Use the refresh button
in the workspace tab bar to reload the current gallery or detail view.

Products opens as a gallery of accessible products. Select a card to review its images and
saved details alongside the Agent chat. Use New product or Edit product when you want to make
changes manually; their forms open in dialogs.

Scripts, Prompts, Clips and Finals show saved work from the selected conversation. Cards open
read-only detail views. Manual Script, Prompt and clip generation are available from explicit actions;
browsing a tab does not start generation. Clip cards show Job status until a video is ready.


- Type **@** to mention a product or saved resource inline. Use **Attach to chat** in the workspace to add a separate attachment.
- Press **Enter** to send, or **Shift + Enter** for a new line.
- Use arrow keys and Enter to select a mention; Escape closes the list.
- Create or edit products and upload reference images in the workspace.
- Open saved Scripts, Prompts, clips and final videos from their tabs.
- Match numbered labels such as **Prompt 01** between the conversation and workspace.
- Use **+** for a new conversation. Scroll up to load earlier messages. Refresh is in the conversation menu.
- **Stop** ends the current Agent loop without cancelling submitted video Jobs. Ask the Agent if you want it to attempt cancellation. **Watch status** only refreshes the displayed Job status; pausing these updates does not stop generation.

Ask the Agent to assemble clips, or edit them in your own editor and attach the finished video to the conversation. Generating scripts or videos creates work in the connected services. Closing the page does not cancel submitted Jobs. Your services must allow the playground's browser origin for Agent WebSockets and direct media uploads.

## Local checks

```sh
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

Tests use local fixtures and do not call a live Agent or submit video-generation Jobs.

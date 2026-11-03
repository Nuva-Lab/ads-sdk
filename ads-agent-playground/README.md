# Ads Agent Playground

Review Products, Scripts, Storyboards, Characters and videos in a visual workspace alongside Ads Agent chat.

## Start

Install Node.js 22.13 or newer, pnpm 11.7.0 and Go 1.22+. From the SDK repository:

```sh
pnpm install --frozen-lockfile
cp ads-agent-playground/.env.example .env
```

Set these values in `.env`:

```dotenv
NUVA_CUSTOMER_API_KEY=your-customer-admin-api-key
NUVA_EXTERNAL_USER_ID=your-test-user-id
```

`NUVA_EXTERNAL_USER_ID` is the user's ID in your own application. The local Go server uses the Admin SDK to issue and refresh access tokens for that user. The Admin key stays on the server.

Run:

```sh
pnpm playground
```

Open **http://127.0.0.1:8995/**. The workspace connects automatically.

You can also supply settings as environment variables; they take precedence over `.env`. To choose another environment file or port:

```sh
pnpm playground --env-file ./my-playground.env --port 8997
```

## Service settings

The preview connects to staging by default (`NUVA_ENVIRONMENT=sandbox`). To switch to production, set these values in `.env` and restart `pnpm playground`:

```dotenv
NUVA_ENVIRONMENT=production
NUVA_CUSTOMER_API_KEY=your-production-customer-admin-api-key
```

Use an Admin API key for the selected environment. `NUVA_ENVIRONMENT` selects both service URLs:

| Variable | Staging default | Production |
| --- | --- | --- |
| `NUVA_AGENT_URL` | `https://agent-staging.nuvalab.ai/api` | `https://agent.nuvalab.ai/api` |
| `NUVA_API_URL` | `https://api-staging.nuvalab.ai` | `https://api.nuvalab.ai` |

Explicit `NUVA_AGENT_URL` and `NUVA_API_URL` settings override the selected environment's defaults. Remove those overrides to use the URLs selected by `NUVA_ENVIRONMENT`. Settings supplied as process environment variables also take precedence over `.env`.

The API URL handles Products, artifacts, media, Script and Storyboard writing, video Jobs and token issuance. **Connection settings** changes the Agent and API URLs for the current browser connection only; it does not change the local server's token issuer. Keep the browser's services and the server's token issuer in the same environment. After changing the environment, server URL overrides, Admin key or `NUVA_EXTERNAL_USER_ID`, restart `pnpm playground` and reload the page.

## Try a creation flow

1. Open **Products**, choose **New product**, select or create a Brand, and enter the product details. Upload reference images from the Product edit view, each with an optional label and description (for example which side of the package it shows).
2. Optionally open **Characters** and create the people who will appear: a name, a description, one or more images (the first is the default; each can have a label and description) and an optional voice file.
3. Type **@** in chat to reference the Product. Ask Ads Agent to write a Script, including your audience, duration and creative requirements.
4. Open the returned Script in the workspace: its concept, length, beats, roles and panels with their lines. Ask for revisions in chat or use **Revise script**.
5. Choose **New Storyboard** on the Script, pick a Character for any role (or leave it to the writer), and add an optional instruction. The written Storyboard opens: its cast, direction and clips, with each shot's people, images and lines shown as chips.
6. **Edit** a Storyboard to change its cast, direction, clip lengths and shots. Shots are text with tokens (`{{role}}`, `{{role:<image id>}}`, `{{product}}`, `{{product:<image id>}}`, `{{L01}}`); **Insert…** adds one at the cursor. Problems show beside the clip or shot they name; **Save Storyboard** saves a new revision.
7. Choose **Render clip** on a clip. Its video Job appears under **Clips**; open it to see its status and play the video when it is ready.
8. Ask Ads Agent to assemble selected clips. Registered final videos appear under **Finals**.

**Revise script** sends a request to Ads Agent in the selected conversation, with the Script attached. **New Storyboard**, Storyboard edits and **Render clip** call the API directly. A Script saved before Storyboards is shown as a read-only legacy Script.

Generation creates work in the connected services. Closing the page or stopping chat does not cancel submitted video Jobs. Ask the Agent if you want it to attempt cancellation.

## Workspace and chat controls

| Control | What it does |
| --- | --- |
| **Products** | Browse accessible Products and review their images and details. |
| **Scripts / Storyboards / Clips / Finals** | Review saved work from the selected conversation. |
| **Characters** | Browse, create and edit the Characters a Storyboard can cast. |
| **@** | Insert a reference to a Product or saved resource into your message. |
| **Attach to chat** | Add the open resource as an attachment. |
| **Refresh** in the workspace tab bar | Reload the current gallery or resource. |
| **Watch status** on a clip | Refresh its Job status until it finishes. Pausing updates leaves generation running. |
| **+** beside Ads Agent | Start a new conversation. |
| **Stop** | End the current Agent loop. |

On Ads Agent messages, use **Reply**, or select text and choose **Add to chat**. The annotation box opens beside the selection; add an optional comment and confirm with **✓**. Confirmed annotations stay in a compact chip—hover to preview, or click to edit/remove.

Press **Enter** to send or **Shift + Enter** for a new line. Use the arrow keys and Enter to select an **@** reference; Escape closes the list. Scroll up in chat to load earlier messages.

The interface defaults to Chinese and remembers your **中文 / English** selection. Existing messages and artifact content keep their original language. Ads Agent follows the language of your message for new replies and creative content, unless you request another output language.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Startup reports a missing setting | Set `NUVA_CUSTOMER_API_KEY` and `NUVA_EXTERNAL_USER_ID` in `.env` or your environment. |
| Connection fails | Check the configured Agent and API URLs and whether those services are reachable. |
| Token issuance fails | Check that the Admin key matches the environment selected by `NUVA_ENVIRONMENT` or the explicit `NUVA_API_URL` override, then restart the playground. |
| An image upload fails in the browser | Check the upload service's CORS settings for the playground origin. |
| An old media preview has expired | Refresh the resource to obtain current media access. |

## Local checks

```sh
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

Tests use local fixtures and do not call a live Agent or submit video-generation Jobs.

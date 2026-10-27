# Ads Agent Playground

Review Products, Scripts, Prompts and videos in a visual workspace alongside Ads Agent chat.

## Start

Install Node.js 22+, pnpm 11.7.0 and Go 1.22+. From the SDK repository:

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

The preview connects to staging by default. Override these two settings in `.env` when using another environment:

| Variable | Staging default | Production |
| --- | --- | --- |
| `NUVA_AGENT_URL` | `https://agent-staging.nuvalab.ai/api` | `https://agent.nuvalab.ai/api` |
| `NUVA_API_URL` | `https://api-staging.nuvalab.ai` | `https://api.nuvalab.ai` |

The API URL handles Products, artifacts, media, Script/Prompt writing, video Jobs and token issuance. **Connection settings** lets you change the Agent and API URLs for the current browser connection. Changing the token issuer or user identity requires updating the environment and restarting `pnpm playground`.

## Try a creation flow

For a repeatable walkthrough with expected results, use the [manual test guide](TESTING.md).

1. Open **Products**, choose **New product**, select or create a Brand, and enter the product details. Upload reference images from the Product view.
2. Type **@** in chat to reference the Product. Ask Ads Agent to write a Script, including your audience, duration and creative requirements.
3. Open the returned Script in the workspace. Ask for revisions in chat or use **Revise script**.
4. Generate Prompts and review their numbered image, video and audio references. Click a reference to preview its media.
5. Request video generation. Open a clip to see its Job status and play the video when it is ready.
6. Ask Ads Agent to assemble selected clips. Registered final videos appear under **Finals**.

Workspace generation buttons send requests to Ads Agent in the selected conversation. Actions on a Script or Prompt include that resource; gallery actions let the Agent help you choose the source.

Generation creates work in the connected services. Closing the page or stopping chat does not cancel submitted video Jobs. Ask the Agent if you want it to attempt cancellation.

## Workspace and chat controls

| Control | What it does |
| --- | --- |
| **Products** | Browse accessible Products and review their images and details. |
| **Scripts / Prompts / Clips / Finals** | Review saved work from the selected conversation. |
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
| Token issuance fails | Check that the Admin key is valid for the configured Store service. |
| An image upload fails in the browser | Check the upload service's CORS settings for the playground origin. |
| An old media preview has expired | Refresh the resource to obtain current media access. |

## Local checks

```sh
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

Tests use local fixtures and do not call a live Agent or submit video-generation Jobs.

# Manual preview testing

Use `0.1.0-preview.1` and your sandbox customer Admin key. The playground defaults to
sandbox (staging). Production requires separately provisioned access. Generation
requests create work in the connected environment.

## 1. Start from the release

With GitHub access to the private repository:

```sh
git clone --branch v0.1.0-preview.1 https://github.com/Nuva-Lab/ads-sdk.git
cd ads-sdk
pnpm install --frozen-lockfile
cp ads-agent-playground/.env.example .env
```

Use Node.js 22+, pnpm 11.7.0 and Go 1.22+. Fill in `.env` locally:

```dotenv
NUVA_ENVIRONMENT=sandbox
NUVA_CUSTOMER_API_KEY=your-customer-admin-api-key
NUVA_EXTERNAL_USER_ID=your-test-user-id
```

Use a stable ID from your application for the test user. Keep the Admin key on the
server; do not put it into browser code or an issue. If you already have a `.env`,
edit the existing file instead of replacing it.

```sh
pnpm playground
```

Open <http://127.0.0.1:8995/>. For a different port or an existing environment file:

```sh
pnpm playground --env-file /absolute/path/to/test.env --port 8997
```

**Expected:** the page connects, the interface starts in Chinese, and the header
still says **Ads Agent**. Switching to English changes the interface, not existing
messages or artifacts.

## 2. Create and inspect a Product

Create a new conversation with **+** beside Ads Agent. Send:

> 为本次测试创建一个品牌“VidMuse 测试品牌”和一款产品“便携咖啡杯”。目标用户是通勤人群，卖点是便携和易清洗。只使用这些已提供的信息，不要编造保温时长或认证。先不要生成视频。

Open **Products**, refresh if needed, and review the saved Brand and Product. Ask
the Agent to change one detail and verify the saved Product reflects it. You can
also exercise **New product** to test optional workspace creation.

**Expected:** the resources are saved, can be reopened, and reflect the requested
details. Agent-created content follows your message language.

## 3. Upload images and attach references

Upload two small, recognizable product images from the Product view. Open each
preview. Use **Attach to chat**, then type **@** and select the saved Product.

**Expected:** both images are attached to the Product and preview correctly. The
composer shows the selected resource and attachments. Ask the Agent to identify
the Product and the attached image count before asking it to create anything.

## 4. Write and revise a Script

With the Product referenced, send:

> 根据这个产品写一个约 10 秒、9:16 竖屏的中文广告脚本。分成两个镜头，突出通勤携带和清洗方便。不要生成提示词或视频。

Open the returned Script. Then send:

> 保留产品信息和时长，把开头改成出门前拿起咖啡杯的动作，结尾展示完整产品。保存修改后的脚本。

**Expected:** Scripts appear in the workspace, the revised Script contains the
requested change, and the original remains available as saved work. Check duration,
shot descriptions, language and referenced Product. Do not assume every run has
identical wording or creative quality.

## 5. Generate and inspect Prompts

Attach the revised Script and ask:

> 根据这个脚本生成视频提示词，使用刚上传的两张产品图片作为参考，保持产品外观一致。先不要提交视频生成。

**Expected:** saved Prompts appear under **Prompts**. Review their duration, aspect
ratio and reference chips; open the numbered references to verify the correct
images. No video Job should be submitted by this request.

## 6. Submit one video

Choose a Prompt and explicitly request:

> 使用这个提示词生成一个视频，不要重复提交。

**Expected:** a saved Job appears under **Clips**, initially queued or running. Follow
its status; when the generation service completes it, open and play the resulting
clip. A queued Job verifies submission, not completion or visual quality. Refreshing
the page must not submit another Job. Closing chat does not cancel a Job.

## 7. Assemble and play a final Ad

Attach two completed clips, or two uploaded video Assets available to your user.
For a quick deterministic check, use two clips at least two seconds long and ask:

> 按附件顺序，将两个视频各取前 2 秒，速度保持 1 倍，直接拼接成一个 4 秒视频。静音，不添加音乐、转场或其他素材，不生成新的视频片段。

**Expected:** the Agent creates a final Ad under **Finals**. Play it to the end and
check clip order, approximately four seconds duration and silence. Assembly is
performed by the Agent; there is no public SDK assembly or cancellation action.

## 8. Check conversation persistence

Reload the page and reopen the same conversation. Create another conversation,
then switch back. If enough conversations exist, use the conversation selector's
older-page control to load more.

**Expected:** saved messages and resources remain available, switching does not
duplicate work, and older pages are reachable. A small account may not have enough
conversations to display a next page. Keep `NUVA_EXTERNAL_USER_ID` unchanged to
return as the same user.

## 9. Test your own SDK integration

Install the TypeScript tarball from the matching GitHub release into your frontend:

```sh
pnpm add /absolute/path/to/nuva-sdk-0.1.0-preview.1.tgz
```

Follow the [TypeScript setup](https://github.com/Nuva-Lab/ads-sdk/blob/v0.1.0-preview.1/typescript/README.md),
[React example](https://github.com/Nuva-Lab/ads-sdk/blob/v0.1.0-preview.1/docs/examples/react-usage.tsx) and
[Go token issuance guide](https://github.com/Nuva-Lab/ads-sdk/blob/v0.1.0-preview.1/go/README.md). Repeat a Product read, new conversation,
message with a reference, and resource read in your own application. To exercise
direct Script, Prompt and video APIs, follow the
[creation example](https://github.com/Nuva-Lab/ads-sdk/blob/v0.1.0-preview.1/docs/examples/creation-chain.ts).

**Expected:** the frontend receives user tokens from your authenticated backend;
the Admin key is never shipped to the browser. Sandbox is the default. Writing and
upload requests use a three-minute default deadline; a timeout does not prove a
write failed, so inspect its saved result before submitting again.

## Report a problem

Include the SDK version, environment, steps, expected and actual result, Session
ID, resource/Job ID and request ID when available. For video quality feedback,
include the Script, Prompt and reference choices. Do not include Admin keys, user
tokens or signed media URLs. Submit the report through this repository's Issues.

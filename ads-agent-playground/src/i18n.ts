export type Locale = "zh-CN" | "en";
export type UiText = {
  readonly key: string;
  readonly values: Readonly<
    Record<string, string | number | UiText | (() => string)>
  >;
};
export type UiLabel = string | UiText;
export const zh: Record<string, string> = {
  "Write an advertising Script for the attached Product. Ask me for any missing creative requirements.": "请为附加的产品编写广告脚本。如需补充创作要求，请先向我确认。",
  "Help me write an advertising Script. Ask me which Product to use and for any missing creative requirements.": "请帮我编写广告脚本。请先确认使用哪个产品，以及需要补充的创作要求。",
  "Generate video Prompts from the attached Script.": "请根据附加的脚本生成视频提示词。",
  "Help me generate video Prompts. Ask me which Script to use.": "请帮我生成视频提示词。请先确认使用哪个脚本。",
  "Generate a video clip using the attached Prompt and its saved generation settings.": "请使用附加的提示词及其已保存的生成设置，生成一个视频片段。",
  "Help me generate a video clip. Ask me which Prompt to use.": "请帮我生成视频片段。请先确认使用哪个提示词。",
  "Help me revise the attached Script. Ask me what changes I want.": "请帮我修改附加的脚本。请先确认我想修改哪些内容。",
  "Select the conversation again before sending this request.": "请重新选择对话后再发送此请求。",
  "Resolve the pending message in chat before starting another request.": "请先在聊天中处理尚未确认发送的消息，再发起新请求。",
  "Confirm or cancel your annotation before starting another request.": "请先确认或取消当前批注，再发起新请求。",
  "Wait until Ads Agent is ready before starting another request.": "请等待 Ads Agent 就绪后再发起新请求。",
  "Add annotation": "添加批注",
  "Annotation comment": "批注内容",
  "Add an optional comment…": "添加可选批注…",
  "Confirm annotation": "确认批注",
  "Cancel annotation": "取消批注",

  "1 annotation": "1 条批注",
  "{count} annotations": "{count} 条批注",
  "Annotations": "批注",
  "Reply details": "回复详情",
  "Remove all annotations": "移除全部批注",
  "Remove annotation {number}": "移除第 {number} 条批注",
  "{number}. Selected text": "{number}. 选中文字",
  "Add comment": "添加批注",
  "Edit comment": "编辑批注",
  "Add your comment…": "添加你的批注…",
  "Your comment": "你的批注",
  "Done": "完成",
  "View original message": "查看原始消息",

  "Quote": "引用",
  "Add to chat": "添加到聊天",
  "Message references": "消息引用",
  "Selected text actions": "选中文字操作",
  "Reply to earlier message": "查看回复的消息",
  "Replying to {author}": "回复 {author}",
  "Quote from {author}": "引用 {author}",
  "Remove reply": "取消回复",
  "Remove quote": "移除引用",
  "Original message": "原始消息",
  "Quoted message": "引用的消息",

  "Assembly is handled by the Agent. This previous request record is preserved.":
    "视频合成由 Agent 处理。此前的请求记录已保留。",
  "Resource numbers could not be saved in this browser.":
    "无法在此浏览器中保存资源编号。",
  "Invalid display index": "资源编号无效",
  "Duplicate display index": "资源编号重复",
  "Product reference": "产品参考图",
  "Image unavailable. Refresh to reload.": "图片不可用，请刷新后重试。",
  "No clips in this conversation.": "此对话暂无片段。",
  "No scripts in this conversation.": "此对话暂无脚本。",
  "No prompts in this conversation.": "此对话暂无提示词。",
  "No finals in this conversation.": "此对话暂无成片。",
  Playground: "工作台",
  Clip: "片段",
  "Video clip": "视频片段",
  seconds: "秒",
  clips: "片段",
  scripts: "脚本",
  prompts: "提示词",
  finals: "成片",
  assembly: "合成",
  script: "脚本",
  video: "视频",
  image: "图片",
  audio: "音频",
  batch: "批次",
  ad: "广告",
  skill: "技能",
  prompt: "提示词",
  "Ads Agent Playground": "Ads Agent 工作台",
  "Ads Agent": "Ads Agent",
  " Playground": " 工作台",
  "Interface language": "界面语言",
  Workspace: "工作区",
  "Playground view": "工作台视图",
  "Creation workspace": "创作工作区",
  "Ads Agent chat": "Ads Agent 对话",
  Connect: "连接",
  Connected: "已连接",
  Offline: "未连接",
  Connecting: "正在连接",
  "Connecting…": "正在连接…",
  "Reconnecting…": "正在重新连接…",
  "Connection interrupted. Reconnecting automatically…": "连接暂时中断，正在自动重新连接…",
  "Connection interrupted. Open connection settings to reconnect.": "连接已中断，请打开连接设置重新连接。",
  "Connection settings": "连接设置",
  "These URLs only change this browser's connection. To switch environments or users, update the server settings and matching Admin key, then restart the playground.":
    "这些地址仅更改当前浏览器的连接。切换环境或用户时，请更新服务端设置，确认 Admin 密钥与环境匹配，然后重启工作台。",
  "YOUR WORKSPACE": "工作区",
  "Agent URL": "智能体服务地址",
  "API URL": "API 服务地址",
  "Apply settings ↗": "应用设置 ↗",
  Products: "产品",
  Product: "产品",
  Scripts: "脚本",
  Script: "脚本",
  Prompts: "提示词",
  Prompt: "提示词",
  Clips: "片段",
  Finals: "成片",
  Ads: "广告",
  Ad: "广告",
  Brand: "品牌",
  Character: "角色",
  Batch: "批次",
  Skill: "技能",
  Media: "媒体",
  Resource: "资源",
  Image: "图片",
  Video: "视频",
  Audio: "音频",
  "Video prompt": "视频提示词",
  "Video generation": "视频生成",
  "Generated clip": "生成片段",
  "Directing plan": "分镜计划",
  "Final ad": "成片广告",
  "Final video": "成片",
  "New product": "新建产品",
  "New script": "新建脚本",
  "New conversation": "新对话",
  Conversation: "对话",
  "Conversation options": "对话选项",
  "Refresh conversation": "刷新对话",
  "Copy conversation ID": "复制对话 ID",
  "Conversation ID copied.": "对话 ID 已复制。",
  "Load older conversations": "加载更早的对话",
  "Loading older conversations…": "正在加载更早的对话…",
  "Retry loading older conversations": "重试加载更早的对话",
  "Refresh workspace": "刷新工作区",
  "Start a conversation": "开始对话",
  "Type a message or use @ to reference a saved resource.":
    "输入消息，或使用 @ 引用已保存的资源。",
  "Write a script": "编写脚本",
  "Plan my next video": "规划视频",
  "Help me write a script for ": "请帮我编写广告脚本：",
  "Create video prompts for ": "请为以下内容生成视频提示词：",
  "Message to Ads Agent": "发送给 Ads Agent 的消息",
  "Describe your idea, or @ mention a resource…":
    "描述你的想法，或用 @ 引用资源…",
  "Mention a resource": "引用资源",
  "Attached resources": "已附加的资源",
  "Enter to send": "按 Enter 发送",
  "Shift + Enter for a new line": "Shift + Enter 换行",
  Stop: "停止",
  "■ Stop": "■ 停止",
  "Send message": "发送消息",
  "Retry send": "重试发送",
  Sending: "发送中",
  Working: "处理中",
  "Needs reply": "等待回复",
  Idle: "空闲",
  Reconnect: "重新连接",
  "Sending your message…": "正在发送消息…",
  "Working on your request…": "正在处理你的请求…",
  User: "用户",
  "Loading…": "加载中…",
  "Opening…": "正在打开…",
  "Loading products…": "正在加载产品…",
  "Loading preview…": "正在加载预览…",
  "Preview unavailable": "预览不可用",
  "Session file": "会话文件",
  "Session files open inside their Session.": "会话文件只能在所属会话中打开。",
  "A file in this Session. The Agent registers it as an Asset when a Character, Storyboard or video uses it.":
    "这是本会话中的文件。角色、分镜或视频使用它时，Agent 会将其登记为素材。",
  Retry: "重试",
  "Loading earlier messages…": "正在加载更早的消息…",
  "Could not load earlier messages.": "无法加载更早的消息。",
  Close: "关闭",
  Create: "创建",
  "Create Product": "创建产品",
  "Create Brand": "创建品牌",
  "Brand name": "品牌名称",
  "Product name": "产品名称",
  Audience: "目标人群",
  "Selling points · one per line": "卖点 · 每行一条",
  "Facts · one per line": "产品事实 · 每行一条",
  "Constraints · one per line": "限制条件 · 每行一条",
  "Additional details (JSON)": "补充信息（JSON）",
  "Additional properties": "补充属性",
  "Product details": "产品详情",
  "Product images": "产品图片",
  "No image": "暂无图片",
  "No products yet.": "暂无产品。",
  "Select a Brand": "选择品牌",
  "Choose a Product": "选择产品",
  "More products": "加载更多产品",
  "More Brands": "加载更多品牌",
  More: "加载更多",
  "Save changes": "保存修改",
  "Edit product": "编辑产品",
  "Edit {p0}": "编辑 {p0}",
  "Attach to chat": "附加到对话",
  "Add image": "添加图片",
  "Upload Product image": "上传产品图片",
  "Save changes before adding images.": "添加图片前，请先保存修改。",
  "Save your form changes before uploading an image.":
    "上传图片前，请先保存表单修改。",
  "Image access unavailable": "图片暂不可用",
  "Product saved.": "产品已保存。",
  "Image uploaded and attached.": "图片已上传并关联。",
  "Select or create a Brand first.": "请先选择或创建品牌。",
  "Product name is required.": "请填写产品名称。",
  "Attributes must be a JSON object.": "补充属性必须是 JSON 对象。",
  "Version {p0}": "版本 {p0}",
  Details: "详情",
  "Resource details": "资源详情",
  Open: "打开",
  "Open by ID": "通过 ID 打开",
  Review: "查看",
  "View {p0}": "查看 {p0}",
  "Review {p0}": "查看 {p0}",
  "Open {p0}: {p1}": "打开{p0}：{p1}",
  "Remove attachment: {p0}": "移除附件：{p0}",
  "No {p0} in this conversation.": "此对话暂无{p0}。",
  "No matching resources. Select or create a product first.":
    "没有匹配的资源，请先选择或创建产品。",
  "Generate prompts": "生成提示词",
  "Generate clip": "生成片段",
  "Assemble clips": "合成片段",
  Instructions: "要求",
  "Minimum seconds": "最短时长（秒）",
  "Maximum seconds": "最长时长（秒）",
  "Generate Script": "生成脚本",
  "Generate revision": "生成修订版",
  "Revise script": "修改脚本",
  "Previous revision": "上一版本",
  "Create prompts": "生成提示词",
  "Script saved.": "脚本已保存。",
  "{p0} Prompts saved.": "已保存 {p0} 条提示词。",
  "{p0} independent Prompts saved.": "已保存 {p0} 条提示词。",
  "Select and save a Product first.": "请先选择并保存产品。",
  "This Script has no resolvable Product source.":
    "此脚本没有可读取的产品来源。",
  "Generate video": "生成视频",
  "Video generation is unavailable.": "视频生成暂不可用。",
  "Choose a video Asset.": "请选择视频素材。",
  "Choose a saved {p0}": "选择已保存的{p0}",
  "Choose {p0}": "选择{p0}",
  "Script ID": "脚本 ID",
  "Prompt ID": "提示词 ID",
  "Job ID": "任务 ID",
  "Asset ID": "素材 ID",
  "{p0} ID": "{p0} ID",
  "Camera: {p0}": "镜头：{p0}",
  "Shot {p0}": "镜头 {p0}",
  "{p0} · {p1}s": "{p0} · {p1} 秒",
  "{p0} · {p1}–{p2}s": "{p0} · {p1}–{p2} 秒",
  "{p0} {p1} · {p2}s": "{p0} {p1} · {p2} 秒",
  "{count} clips · {seconds}s": "{count} 个片段 · {seconds} 秒",
  "{seconds}s": "{seconds} 秒",
  "{seconds} sec": "{seconds} 秒",
  Configuration: "配置",
  "Prompt content": "提示词内容",
  "Prompt configuration": "提示词配置",
  "Generation settings": "生成设置",
  "Generation {p0}": "生成记录 {p0}",
  Duration: "时长",
  Ratio: "比例",
  Model: "模型",
  Resolution: "分辨率",
  Seed: "随机种子",
  Status: "状态",
  "Not recorded": "未记录",
  Default: "默认",
  Unspecified: "未指定",
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  Queued: "排队中",
  Generating: "生成中",
  Ready: "已就绪",
  Failed: "失败",
  Cancelled: "已取消",
  Subjects: "主体",
  Summary: "概述",
  "Reference preservation": "参考保留要求",
  "Scene and motion": "画面与运动",
  Sound: "声音",
  Music: "音乐",
  "Reference assets": "参考素材",
  "Reference inputs": "参考输入",
  "Source text": "原文",
  "Raw prompt": "提示词原文",
  "Raw prompt text": "提示词原文",
  "View raw prompt": "查看原文",
  "Copy prompt": "复制提示词",
  "Prompt copied.": "提示词已复制。",
  "Image {index}": "图片 {index}",
  "Video {index}": "视频 {index}",
  "Audio {index}": "音频 {index}",
  "S{subject} · Img {index}": "主体{subject} · 图{index}",
  "S{subject} · Vid {index}": "主体{subject} · 视频{index}",
  "S{subject} · Aud {index}": "主体{subject} · 音频{index}",
  "S{subject}": "主体{subject}",
  "{label} · missing": "{label} · 缺失",
  "Preview {p0}": "预览 {p0}",
  "{p0}: preview {p1}": "{p0}：预览 {p1}",
  "{p0} unavailable": "{p0} 不可用",
  "Some generation settings could not be loaded.": "部分生成设置加载失败。",
  "Watch status": "跟踪状态",
  "Pause status updates": "暂停状态更新",
  Finished: "已结束",
  "Job failure": "任务失败",
  "Video jobs": "视频任务",
  "No finished ads yet.": "暂无成片广告。",
  "Ad {p0} →": "广告 {p0} →",
  "Completed Job Assets will appear here.": "完成生成后，片段将显示在这里。",
  "Batch ID": "批次 ID",
  Width: "宽度",
  Height: "高度",
  "Frames per second": "帧率",
  "Preserve audio": "保留声音",
  Mute: "静音",
  "Include {p0}": "包含 {p0}",
  "Start (seconds)": "开始时间（秒）",
  "End (seconds; required)": "结束时间（秒，必填）",
  "Assemble final video": "合成成片",
  "Response sent": "已发送回复",
  "Your input is needed": "需要你的回复",
  "This action needs to be handled in your application.":
    "此操作需要在你的应用中处理。",
  "Your answer…": "请输入回复…",
  Answer: "回复",
  Reply: "回复",
  "Unfinished requests": "未完成的请求",
  "Unfinished {p0} request": "未完成的{p0}请求",
  "Previous unfinished requests": "此前未完成的请求",
  "Start a separate {p0} request": "另建一个{p0}请求",
  "A previous {p0} request remains unresolved. Restore its exact input and retry to reuse its operation key.":
    "此前的{p0}请求尚未确认结果，请恢复原输入后重试。",
  "The previous request has been saved. You can start another request.":
    "之前的请求已保留，现在可以发起新请求。",
  "Partial result: saved Prompts are retained. The full request did not finish; retry uses the same operation key.":
    "已保存的提示词已保留。请求尚未全部完成，重试会继续使用原请求标识。",
  "The browser resource list could not be saved. Your saved work is still available.":
    "浏览器资源列表保存失败，已保存的内容仍然可用。",
  "The local resource list could not be restored.": "无法恢复本地资源列表。",
  "Could not confirm that your message was sent. Retry to check the same message.":
    "无法确认消息是否已发送，请重试确认同一条消息。",
  "Could not connect. Check the service URLs and try again.":
    "连接失败，请检查服务地址后重试。",
  "Could not refresh your access. Check the playground backend and try again.":
    "访问凭证刷新失败，请检查工作台后端后重试。",
  "The playground backend is unavailable. Start it with pnpm playground.":
    "工作台后端不可用，请使用 pnpm playground 启动。",
  "The playground has incomplete service settings.": "工作台服务配置不完整。",
  "The playground returned an invalid connection.":
    "工作台返回了无效的连接信息。",
  "Unsupported media URL.": "不支持此媒体地址。",
  "Times require non-negative seconds with at most three decimals.":
    "时间必须是非负秒数，最多保留三位小数。",
  "Missing UI element: {p0}": "缺少界面元素：{p0}",
  "Conversation · {date}": "对话 · {date}",
  "{count} image": "{count} 张图片",
  "{count} images": "{count} 张图片",
  "{count} clip": "{count} 个片段",
  "{count} clips": "{count} 个片段",
  "{count} ad": "{count} 个广告",
  "{count} ads": "{count} 个广告",
  "{count} video job": "{count} 个视频任务",
  "{count} video jobs": "{count} 个视频任务",
  "The previous request may already have created a resource. Starting a separate request can duplicate that work. Keep the previous request record and allow a new one?":
    "之前的请求可能已创建资源。另建请求可能重复生成。是否保留原请求记录并创建新请求？",

  // Script v3, Storyboards and Characters.
  "Storyboards": "分镜",
  "Storyboard": "分镜",
  "Characters": "角色",
  "New Storyboard": "新建分镜",
  "New Character": "新建角色",
  "Narrator": "旁白",
  "Beats": "节拍",
  "Roles": "角色设定",
  "Panels": "画格",
  "Cast": "演员",
  "Direction": "整体指导",
  "Category": "品类",
  "Purchase task": "购买任务",
  "Route": "表现路线",
  "Why this route": "路线理由",
  "Speaker relation": "说话人关系",
  "Length": "时长",
  "Speaks": "有台词",
  "Silent": "无台词",
  "On camera": "出镜说话",
  "Dialogue": "对话",
  "Voiceover": "画外音",
  "Notes: {p0}": "备注：{p0}",
  "This Script has no roles.": "此脚本没有角色设定。",
  "{count} panel": "{count} 个画格",
  "{count} panels": "{count} 个画格",
  "{count} panels · {seconds}s": "{count} 个画格 · {seconds}秒",
  "Legacy Script · {count} clips": "旧版脚本 · {count} 个片段",
  "Legacy Script (read-only)": "旧版脚本（只读）",
  "This Script was saved before Storyboards. It can be read but not used for a Storyboard; write a new Script for that.": "此脚本保存于分镜功能推出之前，只能查看，不能用来制作分镜；如需分镜，请重新编写脚本。",
  "Choose who plays each role, or leave a role for the writer to cast.": "为每个角色选择出演的人物，或交由编写者安排。",
  "Leave it to the writer": "交由编写者安排",
  "{p0} · has a voice": "{p0} · 有声音",
  "This Script has no roles to cast.": "此脚本没有需要选角的角色。",
  "No Characters yet. Create them under Characters to cast them here.": "还没有角色。请先在“角色”中创建，再在这里选角。",
  "Instruction (optional)": "补充要求（可选）",
  "Write Storyboard": "编写分镜",
  "Writing…": "编写中…",
  "A Character can play only one role.": "一个角色人物只能出演一个角色。",
  "Loading Characters…": "正在加载角色…",
  "Storyboard written.": "分镜已编写。",
  "Storyboard saved.": "分镜已保存。",
  "Storyboard revised.": "分镜已修改。",
  "{p0}'s voice": "{p0}的声音",
  "No references yet.": "暂无参考素材。",
  "Unseen narrator, heard only.": "不出镜的旁白，只有声音。",
  "Not a role of this Script.": "不是此脚本的角色。",
  "Played by": "出演",
  "Character {p0} is not available.": "角色 {p0} 不可用。",
  "Not cast": "未选角",
  "Voice": "声音",
  "Character voice": "角色本人声音",
  "Does not speak": "无台词",
  "No voice": "未设置声音",
  "{p0} · Script {p1}": "{p0} · 脚本 {p1}",
  "No direction.": "暂无整体指导。",
  "Render clip": "生成片段",
  "References": "参考素材",
  "This Storyboard's Script is a legacy Script.": "此分镜对应的脚本是旧版脚本。",
  "Preparing the clip…": "正在准备片段…",
  "Starting…": "正在提交…",
  "Clip {p0} is rendering. It appears under Clips.": "片段 {p0} 正在生成，可在“片段”中查看。",
  "Edit": "编辑",
  "Revise with instruction": "按要求修改",
  "Revise Storyboard": "修改分镜",
  "What should change?": "需要修改哪些内容？",
  "Revise": "修改",
  "Say what should change.": "请说明需要修改的内容。",
  "Revising…": "修改中…",
  "1 issue to fix before saving.": "保存前需修正 1 个问题。",
  "{count} issues to fix before saving.": "保存前需修正 {count} 个问题。",
  "No issues. Ready to save.": "没有问题，可以保存。",
  "{p0} in total · Script {p1}": "共 {p0} · 脚本 {p1}",
  "Remove": "移除",
  "No Character": "不指定角色",
  "Described person": "文字描述的人物",
  "Voice from a Character": "使用角色的声音",
  "Look": "外形",
  "Describe the voice": "文字描述声音",
  "Voice description": "声音描述",
  "What holds for the whole video: look, setting, sound, music, on-screen text": "适用于整支视频的要求：画面风格、场景、声音、音乐、屏幕文字",
  "Add clip": "添加片段",
  "Length (seconds)": "时长（秒）",
  "Move clip up": "上移片段",
  "Move clip down": "下移片段",
  "Remove clip": "删除片段",
  "Add shot": "添加镜头",
  "{p0} shot {p1}": "{p0} 镜头 {p1}",
  "Insert into {p0} shot {p1}": "插入到 {p0} 镜头 {p1}",
  "Insert…": "插入…",
  "Move shot up": "上移镜头",
  "Move shot down": "下移镜头",
  "Remove shot": "删除镜头",
  "Save Storyboard": "保存分镜",
  "Saving…": "保存中…",
  "Cancel": "取消",
  "People": "人物",
  "{p0}'s images": "{p0}的图片",
  "Script lines": "脚本台词",
  "More Characters": "更多角色",
  "No Characters yet.": "还没有角色。",
  "Edit character": "编辑角色",
  "Image {p0}": "图片 {p0}",
  "Description": "描述",
  "Voice access unavailable": "声音文件无法访问",
  "No voice file. Storyboards describe this Character's voice instead.": "没有声音文件。分镜会用文字描述此角色的声音。",
  "Character details": "角色详情",
  "Character saved.": "角色已保存。",
  "Name": "名称",
  "Description · looks, persona, speaking style and language": "描述 · 外形、人设、说话风格和语言",
  "Add images": "添加图片",
  "No label": "无标签",
  "Label (optional)": "标签（可选）",
  "Description (optional)": "描述（可选）",
  "Move image up": "上移图片",
  "Move image down": "下移图片",
  "Remove image": "删除图片",
  "Add at least one image. The first is the default.": "请至少添加一张图片，第一张为默认图片。",
  "Voice file": "声音文件",
  "No voice file": "没有声音文件",
  "Replace voice": "替换声音",
  "Add voice": "添加声音",
  "Remove voice": "移除声音",
  "Create Character": "创建角色",
  "Images": "图片",
  "The first image is the default. Up to 10.": "第一张为默认图片，最多 10 张。",
  "Character name is required.": "请填写角色名称。",
  "A Character has at most 10 images.": "一个角色最多 10 张图片。",
  "Image label (optional)": "图片标签（可选）",
  "Image description (optional)": "图片描述（可选）",
  "This Product already has 20 images. The uploaded image {p0} is kept but not attached.": "此产品已有 20 张图片。已上传的图片 {p0} 会保留，但未添加到产品。",
  "The image was uploaded ({p0}) but could not be attached: {p1}": "图片已上传（{p0}），但未能添加到产品：{p1}",
};
let locale: Locale = typeof document === "undefined" ? "en" : "zh-CN";
try {
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("ads-playground:language") === "en"
  )
    locale = "en";
} catch {}
const bindings = new Set<{ target: Node; apply: () => void }>();
const textBindings = new WeakMap<HTMLElement, { text: Text; value: UiLabel }>();
const attributes = new WeakMap<HTMLElement, Map<string, { value: UiLabel }>>();
const listeners = new Set<() => void>();
export const msg = (key: string, values: UiText["values"] = {}): UiText => ({
  key,
  values,
});
export const getLocale = () => locale;
export function translate(key: string, values: UiText["values"] = {}): string {
  const template = locale === "zh-CN" ? (zh[key] ?? key) : key;
  return template.replace(/\{([^}]+)\}/g, (all, name) => {
    const value = values[name];
    return value === undefined
      ? all
      : String(
          typeof value === "function"
            ? value()
            : typeof value === "object"
              ? resolveLabel(value)
              : value,
        );
  });
}
export const resolveLabel = (value: UiLabel): string =>
  typeof value === "string" ? value : translate(value.key, value.values);
export function setText(element: HTMLElement, value: UiLabel) {
  const previous = textBindings.get(element);
  if (typeof value === "string") {
    if (previous) {
      for (const binding of bindings)
        if (binding.target === previous.text) bindings.delete(binding);
      textBindings.delete(element);
    }
    element.textContent = value;
    return;
  }
  if (previous?.text.parentNode === element) {
    previous.value = value;
    previous.text.data = resolveLabel(value);
    return;
  }
  const text = document.createTextNode(resolveLabel(value)),
    entry = { text, value };
  element.replaceChildren(text);
  textBindings.set(element, entry);
  bindings.add({
    target: text,
    apply: () => {
      text.data = resolveLabel(entry.value);
    },
  });
}
export function setAttribute(
  element: HTMLElement,
  name: string,
  value: UiLabel,
) {
  let map = attributes.get(element);
  if (!map) {
    map = new Map();
    attributes.set(element, map);
  }
  let entry = map.get(name);
  if (!entry) {
    entry = { value };
    map.set(name, entry);
    const saved = entry;
    bindings.add({
      target: element,
      apply: () => element.setAttribute(name, resolveLabel(saved.value)),
    });
  }
  entry.value = value;
  element.setAttribute(name, resolveLabel(value));
}
export class UiError extends Error {
  constructor(readonly uiMessage: UiLabel) {
    super(resolveLabel(uiMessage));
  }
}
export function onLocaleChange(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
export function setLocale(value: Locale, persist = true) {
  locale = value;
  if (persist)
    try {
      localStorage.setItem("ads-playground:language", locale);
    } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  for (const entry of bindings) {
    if (entry.target.isConnected) entry.apply();
    else bindings.delete(entry);
  }
  for (const callback of listeners) callback();
}
export function initializeLanguage() {
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]"))
    setText(el, msg(el.dataset.i18n!));
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-attrs]"))
    for (const [name, key] of Object.entries(JSON.parse(el.dataset.i18nAttrs!)))
      setAttribute(el, name, msg(String(key)));
  const select = document.getElementById(
    "ui-language",
  ) as HTMLSelectElement | null;
  if (select) {
    select.value = locale;
    select.onchange = () => setLocale(select.value === "en" ? "en" : "zh-CN");
  }
  setLocale(locale, false);
}

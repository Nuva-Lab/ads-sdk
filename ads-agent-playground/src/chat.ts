import type {
  NuvaClient,
  AgentHandle,
  AgentReadState,
  ResourceLink,
  MessageDraft,
  DynamicToolUIPart,
  MessageView,
} from "@nuva/sdk";
import { Composer, buildDraft } from "./composer.js";
import { action, button, byId, node, notice, report, showPane } from "./ui.js";
export interface ChatHost {
  sdk: NuvaClient;
  scope: string;
  selected(id: string): void;
  resource(record: ResourceLink): void;
  open(record: ResourceLink): void;
  resources(): readonly ResourceLink[];
}
export function sessionLabel(session: { title: string; createdAt: string }) {
  const generated = /^(Workspace\s*·|New conversation$)/i.test(session.title);
  const date = new Date(session.createdAt);
  return generated
    ? `Conversation · ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : session.title;
}
export class ChatController {
  private agent?: AgentHandle;
  private unsubscribe?: () => void;
  private retry?: { draft: MessageDraft; requestId: string };
  private sending = false;
  private epoch = 0;
  private status = "loading";
  private closed = false;
  private hasEarlier = false;
  readonly composer: Composer;
  sessionId = "";
  constructor(private host: ChatHost) {
    this.composer = new Composer(host.resources);
    this.composer.onSend = () => void this.send();
    this.composer.onChange = () => this.controls();
    byId("new-session").onclick = () => void action(() => this.create());
    byId("reconnect").onclick = () =>
      void action(async () => {
        await this.agent?.refresh();
        (byId("reconnect").closest("details") as HTMLDetailsElement).open =
          false;
      });
    byId("earlier").onclick = () =>
      void action(async () => {
        await this.agent?.loadEarlierMessages();
      });
    byId("stop").onclick = () =>
      void action(async () => {
        const b = byId<HTMLButtonElement>("stop");
        b.disabled = true;
        try {
          await this.agent?.stop();
        } finally {
          this.controls();
        }
      });
    byId<HTMLSelectElement>("sessions").onchange = (event) =>
      void action(() =>
        this.connect((event.target as HTMLSelectElement).value),
      );
    byId<HTMLFormElement>("composer").onsubmit = (event) => {
      event.preventDefault();
      void this.send();
    };
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      ".suggestion",
    ))
      button.onclick = () => {
        this.composer.insertPrompt(button.dataset.prompt ?? "");
        this.composer.focus();
      };
  }
  async start() {
    const sessions = await this.loadSessions();
    const saved = localStorage.getItem(`${this.host.scope}:session`);
    if (saved && sessions.some((s) => s.id === saved))
      await this.connect(saved);
    else if (sessions.length) await this.connect(sessions[0].id);
    else {
      this.status = "idle";
      byId<HTMLButtonElement>("new-session").disabled = false;
      await this.create();
    }
  }
  private async loadSessions() {
    const selector = byId<HTMLSelectElement>("sessions"),
      page = await this.host.sdk.sessions.list({ limit: 100 });
    selector.replaceChildren(
      ...page.items.map(
        (session) => new Option(sessionLabel(session), session.id),
      ),
    );
    selector.disabled = false;
    if (this.sessionId) selector.value = this.sessionId;
    return page.items;
  }
  async create() {
    if (this.sending) return;
    byId<HTMLButtonElement>("new-session").disabled = true;
    try {
      const session = await this.host.sdk.sessions.create({
        title: "New conversation",
      });
      await this.loadSessions();
      await this.connect(session.id);
    } finally {
      this.controls();
    }
  }
  async connect(id: string) {
    if (this.sending) return;
    const epoch = ++this.epoch;
    this.status = "loading";
    this.controls();
    await this.host.sdk.sessions.get(id);
    if (epoch !== this.epoch) return;
    this.unsubscribe?.();
    this.sessionId = id;
    this.retry = undefined;
    this.composer.clear();
    localStorage.setItem(`${this.host.scope}:session`, id);
    byId<HTMLSelectElement>("sessions").value = id;
    this.host.selected(id);
    byId("chat").replaceChildren(this.emptyState());
    this.agent = this.host.sdk.agent({ sessionId: id });
    this.unsubscribe = this.agent.subscribe((state) => {
      if (epoch === this.epoch) this.render(state);
    });
  }
  attach(record: ResourceLink) {
    showPane("chat");
    this.composer.insertResource(record);
  }
  destroy() {
    this.epoch++;
    this.unsubscribe?.();
    this.agent = undefined;
    this.composer.clear();
    this.composer.setLocked(true);
    this.composer.destroy();
    this.status = "offline";
    this.controls();
    this.closed = true;
  }
  private emptyState() {
    const empty = node("div", "", "chat-welcome");
    empty.append(
      node("div", "✳", "orb"),
      node("h3", "What are we making?"),
      node(
        "p",
        "Mention a product with @, then tell me what you have in mind.",
      ),
    );
    for (const [label, prompt] of [
      ["Write a script", "Help me write a script for "],
      ["Plan my next video", "Create video prompts for "],
    ])
      empty.append(
        button(
          label + " ↗",
          () => this.composer.insertPrompt(prompt),
          "suggestion",
        ),
      );
    return empty;
  }
  private async send() {
    if (
      !this.agent ||
      this.sending ||
      ["running", "waiting_for_response", "loading"].includes(this.status)
    )
      return;
    if (this.composer.empty() && !this.retry) return;
    const target = this.agent,
      request = this.retry ?? {
        draft: buildDraft(this.composer.parts()),
        requestId: crypto.randomUUID(),
      };
    this.retry = request;
    this.sending = true;
    this.controls();
    try {
      await target.send(request.draft, { requestId: request.requestId });
      this.retry = undefined;
      this.composer.clear();
    } catch (error) {
      if (this.closed) return;
      report(error);
      notice(
        "Could not confirm that your message was sent. Retry to check the same message.",
        true,
      );
    } finally {
      this.sending = false;
      if (this.closed) return;
      this.controls();
      if (
        document.activeElement === document.body ||
        document.activeElement === this.composer.editor
      )
        this.composer.focus();
    }
  }
  private controls() {
    if (this.closed) return;
    const state = this.sending ? "sending" : this.status;
    const labels: Record<string, string> = {
      loading: "Connecting",
      sending: "Sending",
      running: "Working",
      waiting_for_response: "Needs reply",
      idle: "Idle",
      error: "Reconnect",
      offline: "Offline",
    };
    const status = byId("chat-status");
    status.textContent = labels[state] ?? state;
    status.dataset.state = state;
    const busy = ["running", "waiting_for_response"].includes(this.status),
      send = byId<HTMLButtonElement>("send");
    send.textContent = this.retry && !this.sending ? "↻" : "↑";
    send.title = this.retry && !this.sending ? "Retry send" : "Send message";
    send.setAttribute("aria-label", send.title);
    send.hidden = busy;
    send.disabled =
      this.sending ||
      !this.agent ||
      this.status === "loading" ||
      this.status === "error" ||
      (this.composer.empty() && !this.retry);
    this.composer.setLocked(
      this.sending || !!this.retry || !this.agent || this.status === "loading",
    );
    const stop = byId<HTMLButtonElement>("stop");
    stop.hidden = !busy;
    stop.disabled = !busy;
    byId<HTMLButtonElement>("new-session").disabled =
      this.sending || !this.agent;
    byId<HTMLSelectElement>("sessions").disabled = this.sending || !this.agent;
    byId<HTMLButtonElement>("reconnect").disabled = this.sending || !this.agent;
    byId<HTMLButtonElement>("earlier").disabled =
      !this.hasEarlier || !this.agent;
    const activity = byId("agent-activity");
    activity.hidden = !(this.status === "running" || this.sending);
    byId("activity-label").textContent = this.sending
      ? "Sending your message…"
      : "Working on your request…";
    byId("chat").setAttribute(
      "aria-busy",
      String(this.status === "running" || this.status === "loading"),
    );
  }
  private render(state: AgentReadState) {
    this.status = state.status;
    this.hasEarlier =
      state.status !== "loading" &&
      state.status !== "error" &&
      !!state.messages.nextCursor;
    this.controls();
    if (state.status === "loading") return;
    if (state.status === "error") {
      report(state.error);
      return;
    }
    if (state.error) report(state.error);
    const chat = byId("chat"),
      nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 100;
    const existing = new Map(
      [...chat.querySelectorAll<HTMLElement>(".message")].map((el) => [
        el.dataset.id!,
        el,
      ]),
    );
    if (state.messages.items.length)
      chat.querySelector(".chat-welcome")?.remove();
    for (const [index, message] of state.messages.items.entries()) {
      let wrapper = existing.get(message.ref.messageId);
      if (!wrapper) {
        wrapper = node("article", "", `message ${message.role}`);
        wrapper.dataset.id = message.ref.messageId;
        wrapper.append(
          node("div", "", "author"),
          node("div", "", "body"),
          node("div", "", "cards"),
          node("div", "", "questions"),
        );
        chat.append(wrapper);
      }
      wrapper.querySelector(".author")!.textContent =
        message.role === "user"
          ? message.metadata.user.displayName?.trim() || "User"
          : "Ads Agent";
      const signature = JSON.stringify([
        message.content,
        message.state,
        message.state === "failed" ? message.error : null,
      ]);
      const body = wrapper.querySelector<HTMLElement>(".body")!;
      if (body.dataset.signature !== signature) {
        body.dataset.signature = signature;
        body.replaceChildren();
        this.renderContent(body, message);
      }
      const cards = wrapper.querySelector<HTMLElement>(".cards")!,
        resources = [
          ...message.attachments,
          ...message.content.flatMap((part) =>
            part.type === "resource" ? [part.record] : [],
          ),
        ];
      const resourceSignature = JSON.stringify(resources);
      if (cards.dataset.signature !== resourceSignature) {
        for (const resource of resources) this.host.resource(resource);
        cards.dataset.signature = resourceSignature;
        cards.replaceChildren(
          ...resources.map((record) =>
            button(
              `${record.label} ↗`,
              () => this.host.open(record),
              "resource-button",
            ),
          ),
        );
      }
      const calls = message.content.filter(
          (part): part is DynamicToolUIPart => part.type === "dynamic-tool",
        ),
        questions = wrapper.querySelector<HTMLElement>(".questions")!,
        q = JSON.stringify([calls, message.state]);
      if (questions.dataset.signature !== q) {
        questions.dataset.signature = q;
        questions.replaceChildren();
        for (const call of calls)
          this.question(
            questions,
            call,
            message.state === "interrupted" || message.state === "failed",
          );
      }
      if (chat.children[index] !== wrapper)
        chat.insertBefore(wrapper, chat.children[index] ?? null);
      existing.delete(message.ref.messageId);
    }
    for (const element of existing.values()) element.remove();
    if (nearBottom) chat.scrollTop = chat.scrollHeight;
  }
  private renderContent(body: HTMLElement, message: MessageView) {
    for (const part of message.content) {
      if (part.type === "text") {
        if (part.format === "markdown")
          for (const chunk of part.text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
            if (chunk.startsWith("**") && chunk.endsWith("**"))
              body.append(node("strong", chunk.slice(2, -2)));
            else if (chunk.startsWith("`") && chunk.endsWith("`"))
              body.append(node("code", chunk.slice(1, -1)));
            else body.append(document.createTextNode(chunk));
          }
        else body.append(document.createTextNode(part.text));
      } else if (part.type === "quote") {
        if ("ref" in part.target) {
          const record = part.target;
          body.append(
            button(
              `@${record.label}`,
              () => this.host.open(record),
              "inline-reference",
            ),
          );
        } else if (part.text) body.append(node("span", part.text));
      }
    }
    if (message.state === "failed")
      body.append(node("p", message.error.message, "form-error"));
  }
  private question(
    container: HTMLElement,
    call: DynamicToolUIPart,
    ended: boolean,
  ) {
    const review = call.toolName === "nuva.review",
      question =
        typeof call.input.question === "string"
          ? call.input.question
          : typeof call.input.prompt === "string"
            ? call.input.prompt
            : "Your input is needed";
    if (call.state !== "input-available" || ended) {
      if (call.state === "output-available")
        container.append(node("span", "Response sent", "badge"));
      else if (call.state === "output-error")
        container.append(node("p", call.errorText));
      return;
    }
    container.append(node("strong", question));
    const epoch = this.epoch,
      target = this.agent!;
    if (!review && typeof call.input.question !== "string") {
      container.append(
        node(
          "p",
          "This action needs to be handled in your application.",
          "muted",
        ),
      );
      return;
    }
    const form = node("form"),
      answer = node("textarea");
    answer.placeholder = review ? "Add feedback (optional)…" : "Your answer…";
    answer.setAttribute("aria-label", review ? "Review feedback" : "Answer");
    form.append(answer);
    container.append(form);
    const respond = async (output: Record<string, string>) => {
      if (epoch !== this.epoch) return;
      const buttons = [...form.querySelectorAll("button")];
      buttons.forEach((b) => (b.disabled = true));
      try {
        await target.respond(call, output);
      } finally {
        if (form.isConnected) buttons.forEach((b) => (b.disabled = false));
      }
    };
    if (review) {
      const row = node("div", "", "row");
      row.append(
        button("Request changes", () =>
          action(() => respond({ decision: "reject", text: answer.value })),
        ),
        button(
          "Approve",
          () =>
            action(() => respond({ decision: "approve", text: answer.value })),
          "primary",
        ),
      );
      form.append(row);
    } else {
      const submit = node("button", "Reply", "primary");
      submit.type = "submit";
      form.append(submit);
      form.onsubmit = (event) => {
        event.preventDefault();
        void action(() => respond({ answer: answer.value }));
      };
    }
  }
}

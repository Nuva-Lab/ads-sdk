import { getLocale, translate, type UiLabel } from "./i18n.js";
import { option } from "./ui.js";
import { msg, setAttribute, setText } from "./i18n.js";
import type {
  NuvaClient,
  AgentHandle,
  AgentReadState,
  ResourceLink,
  MessageDraft,
  DynamicToolUIPart,
  MessageView,
} from "@nuva/sdk";
import { ResourceCards } from "./resource-cards.js";
import { readResource } from "./resources.js";
import { usefulLabel, resourcePresentation } from "./resource-presentation.js";
import { Composer, buildDraft } from "./composer.js";
import { action, button, byId, node, notice, report, showPane } from "./ui.js";
export interface ChatHost {
  sdk: NuvaClient;
  scope: string;
  selected(id: string): void;
  resource(record: ResourceLink): void;
  open(record: ResourceLink): void;
  resources(): readonly ResourceLink[];
  indexLabel?(record: ResourceLink): string | undefined;
}
export function sessionLabel(session: {
  title: string;
  createdAt: string;
}): UiLabel {
  const generated = /^(Workspace\s*·|New conversation$)/i.test(session.title);
  const date = new Date(session.createdAt);
  return generated
    ? msg("Conversation · {date}", {
        date: () =>
          `${date.toLocaleDateString(getLocale() === "zh-CN" ? "zh-CN" : "en-US", { month: "short", day: "numeric" })}, ${date.toLocaleTimeString(getLocale() === "zh-CN" ? "zh-CN" : "en-US", { hour: "numeric", minute: "2-digit" })}`,
      })
    : session.title;
}
export class ChatController {
  private agent?: AgentHandle;
  private unsubscribe?: () => void;
  private retry?: { draft: MessageDraft; requestId: string };
  private attached: ResourceLink[] = [];
  private sending = false;
  private epoch = 0;
  private status = "loading";
  private closed = false;
  private hasEarlier = false;
  private historyCursor: string | null = null;
  private historyLoading = false;
  private historyError = false;
  private historyAnchor?: { id: string; offset: number };
  private list = node("div", "", "message-list");
  private historyNotice = node("div", "", "history-notice");
  private cards: ResourceCards;
  private viewEvents = new AbortController();
  readonly composer: Composer;
  sessionId = "";
  constructor(private host: ChatHost) {
    this.historyNotice.hidden = true;
    this.historyNotice.setAttribute("role", "status");
    byId("chat").replaceChildren(this.historyNotice, this.list);
    byId("chat").addEventListener(
      "scroll",
      () => {
        if (this.historyLoading) {
          this.historyAnchor = this.anchor();
          return;
        }
        if (byId("chat").scrollTop < 65) void this.loadHistory();
      },
      { passive: true, signal: this.viewEvents.signal },
    );
    this.cards = this.makeCards();
    this.composer = new Composer(() =>
      host.resources().map((record) => this.cards.label(record)),
    );
    this.composer.onSend = () => void this.send();
    this.composer.onChange = () => this.controls();
    byId("new-session").onclick = () => void action(() => this.create());
    byId("copy-conversation-id").onclick = () =>
      void action(async () => {
        if (this.closed || !this.sessionId || this.status === "loading") return;
        await navigator.clipboard.writeText(this.sessionId);
        (byId("copy-conversation-id").closest("details") as HTMLDetailsElement).open = false;
        notice(msg("Conversation ID copied."));
      });
    byId("reconnect").onclick = () =>
      void action(async () => {
        await this.agent?.refresh();
        (byId("reconnect").closest("details") as HTMLDetailsElement).open =
          false;
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
      ...page.items.map((session) => option(sessionLabel(session), session.id)),
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
    this.cards.dispose();
    this.cards = this.makeCards();
    this.historyLoading = false;
    this.historyError = false;
    this.historyCursor = null;
    this.historyAnchor = undefined;
    this.renderHistoryNotice();
    this.sessionId = id;
    this.retry = undefined;
    this.attached = [];
    this.drawAttachments();
    this.composer.clear();
    localStorage.setItem(`${this.host.scope}:session`, id);
    byId<HTMLSelectElement>("sessions").value = id;
    this.host.selected(id);
    this.list.replaceChildren(this.emptyState());
    this.agent = this.host.sdk.agent({ sessionId: id });
    this.unsubscribe = this.agent.subscribe((state) => {
      if (epoch === this.epoch) this.render(state);
    });
  }
  attach(record: ResourceLink) {
    showPane("chat");
    if (
      !this.attached.some(
        (item) =>
          item.ref.kind === record.ref.kind && item.ref.id === record.ref.id,
      )
    ) {
      this.attached.push({
        ref: record.ref,
        label: resourcePresentation(record, record).title,
      });
    }
    this.drawAttachments();
    this.controls();
    this.composer.focus();
  }
  private drawAttachments() {
    byId("composer-attachments").replaceChildren(
      ...this.attached.map((record) => {
        const remove = button(
          `${this.cards.label(record).label} ×`,
          () => {
            this.attached = this.attached.filter((item) => item !== record);
            this.drawAttachments();
            this.controls();
          },
          "composer-attachment",
        );
        setAttribute(
          remove,
          "aria-label",
          msg("Remove attachment: {p0}", {
            p0: this.cards.label(record).label,
          }),
        );
        remove.disabled = this.sending || !!this.retry;
        return remove;
      }),
    );
  }
  destroy() {
    this.epoch++;
    this.viewEvents.abort();
    this.cards.dispose();
    this.unsubscribe?.();
    this.agent = undefined;
    this.attached = [];
    this.drawAttachments();
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
      node("h3", msg("Start a conversation")),
      node("p", msg("Type a message or use @ to reference a saved resource.")),
    );
    for (const [label, prompt] of [
      ["Write a script", "Help me write a script for "],
      ["Plan my next video", "Create video prompts for "],
    ])
      empty.append(
        button(
          msg("{label} ↗", { label: msg(label) }),
          () => this.composer.insertPrompt(translate(prompt)),
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
    if (this.composer.empty() && !this.attached.length && !this.retry) return;
    const target = this.agent,
      request = this.retry ?? {
        draft: this.attached.reduce(
          (draft, record) => draft.attach(record),
          buildDraft(this.composer.parts()),
        ),
        requestId: crypto.randomUUID(),
      };
    this.retry = request;
    this.sending = true;
    this.controls();
    try {
      await target.send(request.draft, { requestId: request.requestId });
      this.retry = undefined;
      this.attached = [];
      this.drawAttachments();
      this.composer.clear();
    } catch (error) {
      if (this.closed) return;
      report(error);
      notice(
        msg(
          "Could not confirm that your message was sent. Retry to check the same message.",
        ),
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
    this.drawAttachments();
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
    setText(status, msg(labels[state] ?? state));
    status.dataset.state = state;
    const busy = ["running", "waiting_for_response"].includes(this.status),
      send = byId<HTMLButtonElement>("send");
    send.textContent = this.retry && !this.sending ? "↻" : "↑";
    setAttribute(
      send,
      "title",
      this.retry && !this.sending ? msg("Retry send") : msg("Send message"),
    );
    setAttribute(
      send,
      "aria-label",
      this.retry && !this.sending ? msg("Retry send") : msg("Send message"),
    );
    send.hidden = busy;
    send.disabled =
      this.sending ||
      !this.agent ||
      this.status === "loading" ||
      this.status === "error" ||
      (this.composer.empty() && !this.attached.length && !this.retry);
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
    byId<HTMLButtonElement>("copy-conversation-id").disabled =
      !this.agent || !this.sessionId || this.status === "loading";
    const activity = byId("agent-activity");
    activity.hidden = !(this.status === "running" || this.sending);
    setText(
      byId("activity-label"),
      this.sending
        ? msg("Sending your message…")
        : msg("Working on your request…"),
    );
    byId("chat").setAttribute(
      "aria-busy",
      String(this.status === "running" || this.status === "loading"),
    );
  }
  private makeCards() {
    return new ResourceCards({
      root: byId("chat"),
      indexLabel: (record) => this.host.indexLabel?.(record),
      read: (record) => readResource(this.host.sdk, record),
      watchJob: (id, receive) => this.host.sdk.jobs.subscribe(id, receive),
      open: (record) => this.host.open(record),
      layout: (change) => this.withScrollAnchor(change),
    });
  }
  private anchor() {
    const chat = byId("chat"),
      bounds = chat.getBoundingClientRect();
    for (const element of this.list.querySelectorAll<HTMLElement>(
      "[data-scroll-anchor]",
    )) {
      const rect = element.getBoundingClientRect();
      if (
        rect.height > 0 &&
        rect.bottom > bounds.top + 1 &&
        rect.top < bounds.bottom
      )
        return {
          id: element.dataset.scrollAnchor!,
          offset: rect.top - bounds.top,
        };
    }
  }
  private restoreAnchor(anchor: { id: string; offset: number } | undefined) {
    if (!anchor) return;
    const target = [
      ...this.list.querySelectorAll<HTMLElement>("[data-scroll-anchor]"),
    ].find((element) => element.dataset.scrollAnchor === anchor.id);
    if (target) {
      const chat = byId("chat");
      chat.scrollTop +=
        target.getBoundingClientRect().top -
        chat.getBoundingClientRect().top -
        anchor.offset;
    }
  }
  private withScrollAnchor(change: () => void) {
    if (this.closed) return;
    const chat = byId("chat"),
      atBottom =
        !this.historyLoading &&
        chat.scrollHeight - chat.scrollTop - chat.clientHeight < 65,
      anchor = this.anchor();
    change();
    if (atBottom) chat.scrollTop = chat.scrollHeight;
    else this.restoreAnchor(anchor);
  }
  private renderHistoryNotice() {
    this.historyNotice.replaceChildren();
    this.historyNotice.hidden = !this.historyLoading && !this.historyError;
    const pill = node("div", "", "history-pill");
    this.historyNotice.append(pill);
    if (this.historyLoading)
      pill.append(
        node("span", "", "small-spinner"),
        node("span", msg("Loading earlier messages…")),
      );
    else if (this.historyError)
      pill.append(
        node("span", msg("Could not load earlier messages.")),
        button(msg("Retry"), () => {
          this.historyError = false;
          this.renderHistoryNotice();
          void this.loadHistory();
        }),
      );
  }
  private async loadHistory() {
    if (
      !this.agent ||
      !this.hasEarlier ||
      this.historyLoading ||
      this.historyError ||
      this.closed
    )
      return;
    const epoch = this.epoch,
      agent = this.agent,
      cursor = this.historyCursor;
    this.historyAnchor = this.anchor();
    this.historyLoading = true;
    this.renderHistoryNotice();
    try {
      await agent.loadEarlierMessages();
      if (epoch === this.epoch && this.historyCursor === cursor)
        this.historyError = true;
    } catch {
      if (epoch === this.epoch) this.historyError = true;
    } finally {
      if (epoch !== this.epoch || this.closed) return;
      const anchor = this.anchor();
      this.historyLoading = false;
      this.historyAnchor = undefined;
      this.renderHistoryNotice();
      this.restoreAnchor(anchor);
      if (
        !this.historyError &&
        this.hasEarlier &&
        byId("chat").scrollHeight <= byId("chat").clientHeight + 2
      )
        requestAnimationFrame(() => void this.loadHistory());
    }
  }
  private render(state: AgentReadState) {
    this.status = state.status;
    this.hasEarlier =
      state.status !== "loading" &&
      state.status !== "error" &&
      !!state.messages.nextCursor;
    this.historyCursor =
      state.status !== "loading" && state.status !== "error"
        ? state.messages.nextCursor
        : null;
    if (!this.hasEarlier && !this.historyLoading && this.historyError) {
      this.historyError = false;
      this.renderHistoryNotice();
    }
    this.controls();
    if (state.status === "loading") return;
    if (state.status === "error") {
      report(state.error);
      return;
    }
    if (state.error) report(state.error);
    const chat = byId("chat"),
      atBottom =
        !this.historyLoading &&
        chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
    const anchor = this.historyAnchor ?? this.anchor();
    const existing = new Map(
      [...this.list.querySelectorAll<HTMLElement>(".message")].map(
        (element) => [element.dataset.id!, element],
      ),
    );
    if (state.messages.items.length)
      this.list.querySelector(".chat-welcome")?.remove();
    for (const [index, message] of state.messages.items.entries()) {
      let wrapper = existing.get(message.ref.messageId);
      if (!wrapper) {
        wrapper = node("article", "", `message ${message.role}`);
        wrapper.dataset.id = message.ref.messageId;
        const bubble = node("div", "", "message-bubble");
        bubble.append(node("div", "", "message-content"));
        wrapper.append(
          node("div", "", "author"),
          node("div", "", "message-attachments"),
          bubble,
        );
        this.list.append(wrapper);
      }
      setText(
        wrapper.querySelector(".author")!,
        message.role === "user"
          ? message.metadata.user.displayName?.trim() || msg("User")
          : msg("Ads Agent"),
      );
      const attached = [
        ...message.attachments,
        ...(message.role === "user"
          ? message.content.flatMap((part) =>
              part.type === "resource" ? [part.record] : [],
            )
          : []),
      ];
      const attachments = wrapper.querySelector<HTMLElement>(
        ".message-attachments",
      )!;
      attachments.dataset.scrollAnchor = JSON.stringify([
        message.ref.messageId,
        "attachments",
      ]);
      const attachmentKey = JSON.stringify(attached);
      if (attachments.dataset.signature !== attachmentKey) {
        attachments.dataset.signature = attachmentKey;
        for (const record of attached) this.host.resource(record);
        attachments.replaceChildren(
          ...attached.map((record) => this.cards.create(record, true)),
        );
      }
      const body = wrapper.querySelector<HTMLElement>(".message-content")!;
      const parts = new Map(
        [...body.children].map((element) => [
          (element as HTMLElement).dataset.partId!,
          element as HTMLElement,
        ]),
      );
      let position = 0;
      for (const part of message.content) {
        if (message.role === "user" && part.type === "resource") continue;
        const key = `${part.type}:${part.type === "dynamic-tool" ? part.toolCallId : part.id}`;
        const signature = JSON.stringify([
          part,
          part.type === "dynamic-tool"
            ? message.state === "failed" || message.state === "interrupted"
            : null,
        ]);
        let element = parts.get(key);
        if (!element) {
          element = node("div", "", `message-part part-${part.type}`);
          element.dataset.partId = key;
          element.classList.toggle(
            "part-compact",
            part.type === "resource" &&
              ["prompt", "batch", "ad", "job"].includes(part.record.ref.kind),
          );
          element.dataset.scrollAnchor = JSON.stringify([
            message.ref.messageId,
            key,
          ]);
        }
        if (element.dataset.signature !== signature) {
          element.dataset.signature = signature;
          element.replaceChildren();
          if (part.type === "text")
            this.renderText(element, part.text, part.format);
          else if (part.type === "resource") {
            this.host.resource(part.record);
            element.append(this.cards.create(part.record));
          } else if (part.type === "quote") {
            if ("ref" in part.target) {
              const record = part.target;
              element.append(
                button(
                  `@${usefulLabel(record) ?? resourcePresentation(record).kind}`,
                  () => this.host.open(record),
                  "inline-reference",
                ),
              );
            } else if (part.text) element.append(node("span", part.text));
          } else if (part.type === "dynamic-tool")
            this.question(
              element,
              part,
              message.state === "interrupted" || message.state === "failed",
            );
        }
        if (body.children[position] !== element)
          body.insertBefore(element, body.children[position] ?? null);
        position++;
        parts.delete(key);
      }
      for (const element of parts.values()) element.remove();
      const bubble = wrapper.querySelector<HTMLElement>(".message-bubble")!;
      let failure = bubble.querySelector<HTMLElement>(".message-failure");
      if (message.state === "failed") {
        if (!failure) {
          failure = node("p", "", "form-error message-failure");
          bubble.append(failure);
        }
        failure.textContent = message.error.message;
      } else failure?.remove();
      bubble.hidden =
        body.childElementCount === 0 && message.state !== "failed";
      if (this.list.children[index] !== wrapper)
        this.list.insertBefore(wrapper, this.list.children[index] ?? null);
      existing.delete(message.ref.messageId);
    }
    for (const element of existing.values()) element.remove();
    this.cards.prune();
    if (atBottom) chat.scrollTop = chat.scrollHeight;
    else this.restoreAnchor(anchor);
    if (
      this.hasEarlier &&
      !this.historyLoading &&
      !this.historyError &&
      chat.scrollHeight <= chat.clientHeight + 2
    )
      requestAnimationFrame(() => void this.loadHistory());
  }
  private renderText(element: HTMLElement, text: string, format: string) {
    if (format !== "markdown") {
      element.textContent = text;
      return;
    }
    for (const chunk of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
      if (chunk.startsWith("**") && chunk.endsWith("**"))
        element.append(node("strong", chunk.slice(2, -2)));
      else if (chunk.startsWith("`") && chunk.endsWith("`"))
        element.append(node("code", chunk.slice(1, -1)));
      else element.append(document.createTextNode(chunk));
    }
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
        container.append(node("span", msg("Response sent"), "badge"));
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
          msg("This action needs to be handled in your application."),
          "muted",
        ),
      );
      return;
    }
    const form = node("form"),
      answer = node("textarea");
    setAttribute(
      answer,
      "placeholder",
      review ? msg("Add feedback (optional)…") : msg("Your answer…"),
    );
    setAttribute(
      answer,
      "aria-label",
      review ? msg("Review feedback") : msg("Answer"),
    );
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
        button(msg("Request changes"), () =>
          action(() => respond({ decision: "reject", text: answer.value })),
        ),
        button(
          msg("Approve"),
          () =>
            action(() => respond({ decision: "approve", text: answer.value })),
          "primary",
        ),
      );
      form.append(row);
    } else {
      const submit = node("button", msg("Reply"), "primary");
      submit.type = "submit";
      form.append(submit);
      form.onsubmit = (event) => {
        event.preventDefault();
        void action(() => respond({ answer: answer.value }));
      };
    }
  }
}

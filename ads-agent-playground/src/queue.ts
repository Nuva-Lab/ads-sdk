import type { MessageRef, MessageView, QueuedMessage, ResourceLink } from "@nuva/sdk";
import type { ComposerPart } from "./composer.js";
import { icon, type IconName } from "./icons.js";
import { msg, onLocaleChange, resolveLabel, type UiText } from "./i18n.js";

/** A queued message on one line: its text, `@` references by label, and quotes and attachments by count. */
export function queuedPreview(message: MessageView): string {
  const text = message.content
    .flatMap((part) =>
      part.type === "text"
        ? [part.text]
        : part.type === "quote" && "ref" in part.target
          ? [`@${part.target.label}`]
          : part.type === "quote"
            ? ["“…”"]
            : [],
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const attached = message.attachments.length
    ? resolveLabel(message.attachments.length === 1 ? msg("1 attachment") : msg("{p0} attachments", { p0: message.attachments.length }))
    : "";
  return [text, attached].filter(Boolean).join(" · ");
}

/**
 * A queued message taken apart for the composer, to edit it: inline text and `@` references, quoted messages with
 * their text, the reply source and the attachments.
 */
export function editableParts(message: MessageView) {
  const parts: ComposerPart[] = [];
  const quotes: { ref: MessageRef; text: string }[] = [];
  for (const part of message.content) {
    if (part.type === "text") parts.push({ type: "text", text: part.text });
    else if (part.type === "quote" && "ref" in part.target) parts.push({ type: "quote", record: part.target });
    else if (part.type === "quote" && "messageId" in part.target) quotes.push({ ref: part.target, text: part.text ?? "" });
  }
  return { parts, quotes, replyTo: message.replyTo, attachments: [...message.attachments] as ResourceLink[] };
}

export interface QueueListActions {
  /** Puts the message back into the composer: the client removes it from the queue first. */
  edit(entry: QueuedMessage): Promise<unknown>;
  remove(entry: QueuedMessage): Promise<unknown>;
  /** Whether Edit can put a message into the composer now; false while the composer holds another draft. */
  canEdit(): boolean;
}
/**
 * The messages waiting above the composer, one line each with Edit and Remove. Each joins the conversation by itself at
 * the Agent's next step (after its current tool results), then leaves this list. One that could not be sent says why.
 */
export class QueueList {
  private queue: readonly QueuedMessage[] = [];
  private writable = true;
  /** Messages with an action in flight; their buttons wait for it. */
  private readonly acting = new Set<string>();
  private readonly unsubscribe: () => void;
  constructor(
    private readonly root: HTMLElement,
    private readonly actions: QueueListActions,
  ) {
    this.unsubscribe = onLocaleChange(() => this.render());
    root.hidden = true;
  }
  update(queue: readonly QueuedMessage[] | undefined, writable = true) {
    this.queue = queue ?? [];
    this.writable = writable;
    this.render();
  }
  /** Draws again, for example when the composer's draft changes whether Edit is possible. */
  refresh() {
    this.render();
  }
  dispose() {
    this.update(undefined);
    this.unsubscribe();
  }
  private act(entry: QueuedMessage, action: (entry: QueuedMessage) => Promise<unknown>) {
    const id = entry.message.ref.messageId;
    if (this.acting.has(id)) return;
    this.acting.add(id);
    this.render();
    void action(entry).finally(() => {
      this.acting.delete(id);
      this.render();
    });
  }
  private button(label: UiText, name: IconName, onClick: () => void, disabled: boolean) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "queued-action icon-button";
    const title = resolveLabel(label);
    element.title = title;
    element.setAttribute("aria-label", title);
    element.append(icon(name));
    element.disabled = disabled;
    element.onclick = onClick;
    return element;
  }
  /** Rebuilt on every state frame, so plain text (no locale bindings that would pile up). */
  private render() {
    this.root.hidden = this.queue.length === 0;
    this.root.setAttribute("aria-label", resolveLabel(msg("Queued messages")));
    this.root.replaceChildren(
      ...this.queue.map((entry) => {
        const id = entry.message.ref.messageId,
          locked = !this.writable || this.acting.has(id);
        const row = document.createElement("li");
        row.className = "queued-message";
        row.dataset.id = id;
        row.dataset.state = entry.error ? "failed" : "queued";
        const status = document.createElement("span");
        status.className = "queued-status";
        status.textContent = resolveLabel(entry.error ? msg("Not sent") : msg("Queued"));
        const preview = queuedPreview(entry.message);
        const text = document.createElement("span");
        text.className = "queued-text";
        text.textContent = preview;
        text.title = preview;
        const actions = document.createElement("span");
        actions.className = "queued-actions";
        actions.append(
          this.button(msg("Edit"), "edit", () => this.act(entry, this.actions.edit), locked || !this.actions.canEdit()),
          this.button(msg("Remove"), "trash", () => this.act(entry, this.actions.remove), locked),
        );
        row.append(status, text, actions);
        if (entry.error) {
          const error = document.createElement("span");
          error.className = "queued-error";
          error.textContent = entry.error.message;
          row.append(error);
        }
        return row;
      }),
    );
  }
}

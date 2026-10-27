import {
  Message,
  type MessageDraft,
  type MessageRef,
  type MessageView,
} from "@nuva/sdk";
import { msg, setAttribute, type UiLabel } from "./i18n.js";
import { button, node } from "./ui.js";

export type MessageQuote = {
  id: string;
  message: MessageView;
  text: string;
  comment: string;
};
export const messageText = (message: MessageView) =>
  message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
const author = (message: MessageView): UiLabel =>
  message.role === "assistant"
    ? msg("Ads Agent")
    : message.metadata.user.displayName?.trim() || msg("User");

/** Draft-only UI state; IDs and selected text are passed to the SDK unchanged. */
export class MessageReferenceDraft {
  reply?: MessageView;
  quotes: MessageQuote[] = [];
  constructor(readonly sessionId: string) {}
  private check(message: MessageView) {
    if (message.role !== "assistant")
      throw new Error("Only Ads Agent messages can be replied to or quoted.");
    if (
      !this.sessionId ||
      message.ref.sessionId !== this.sessionId ||
      !message.ref.messageId
    )
      throw new Error("A message from the current conversation is required.");
  }
  setReply(message: MessageView) {
    this.check(message);
    this.reply = { ...message, ref: { ...message.ref } };
  }
  addQuote(message: MessageView, text: string, comment = "") {
    this.check(message);
    if (!text.trim()) return;
    if (
      !this.quotes.some(
        (item) =>
          item.message.ref.messageId === message.ref.messageId &&
          item.text === text &&
          item.comment === comment,
      )
    )
      this.quotes.push({
        id: crypto.randomUUID(),
        comment,
        message: { ...message, ref: { ...message.ref } },
        text,
      });
  }
  build(): MessageDraft {
    let draft = Message.create();
    if (this.reply) draft = draft.replyTo(this.reply);
    for (const item of this.quotes) {
      draft = draft.quote(item.message, item.text);
      if (item.comment.trim()) draft = draft.text(item.comment);
    }
    return draft;
  }
}

export class ChatReferences {
  private draft = new MessageReferenceDraft("");
  private messages = new Map<string, MessageView>();
  private locked = true;
  private life = new AbortController();
  private panel = node("div", "", "chat-draft-references");
  private toolbar = node("div", "", "chat-selection-toolbar");
  private selection?: Pick<MessageQuote, "message" | "text"> & { range: Range };
  private annotationEditor = node("div", "", "annotation-inline-editor");
  private annotationInput = node("textarea");
  private pendingAnnotation?: {
    message: MessageView;
    text: string;
    anchor: Range | HTMLElement;
    rect: DOMRect;
  };
  private popover = node("div", "", "chat-reference-popover");
  private openKind?: "reply" | "quotes";
  private pinned = false;
  private triggers = new Map<"reply" | "quotes", HTMLButtonElement>();
  private editing?: string;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private suppressFocusOpen = false;
  constructor(
    private options: {
      chat: HTMLElement;
      viewport: HTMLElement;
      composer: HTMLElement;
      session: () => string;
      changed: () => void;
      focus: () => void;
      open: (ref: MessageRef) => void;
    },
  ) {
    this.panel.hidden = true;
    setAttribute(this.panel, "aria-label", msg("Message references"));
    options.composer.prepend(this.panel);
    this.popover.id = `chat-reference-details-${crypto.randomUUID()}`;
    this.popover.hidden = true;
    this.popover.setAttribute("role", "dialog");
    this.popover.addEventListener("pointerenter", () =>
      clearTimeout(this.closeTimer),
    );
    this.popover.addEventListener("pointerleave", () => this.scheduleClose());
    document.body.append(this.popover);
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (
          !this.panel.contains(event.target as Node) &&
          !this.popover.contains(event.target as Node)
        )
          this.hidePopover();
      },
      { signal: this.life.signal },
    );
    document.addEventListener(
      "focusin",
      (event) => {
        if (
          !this.panel.contains(event.target as Node) &&
          !this.popover.contains(event.target as Node)
        )
          this.hidePopover();
      },
      { signal: this.life.signal },
    );
    this.annotationEditor.hidden = true;
    this.annotationEditor.setAttribute("role", "dialog");
    setAttribute(this.annotationEditor, "aria-label", msg("Add annotation"));
    setAttribute(this.annotationInput, "aria-label", msg("Annotation comment"));
    setAttribute(
      this.annotationInput,
      "placeholder",
      msg("Add an optional comment…"),
    );
    this.annotationInput.rows = 1;
    this.annotationInput.addEventListener("input", () => {
      this.annotationInput.style.height = "auto";
      this.annotationInput.style.height = `${Math.min(120, this.annotationInput.scrollHeight)}px`;
      this.positionAnnotationEditor();
    });
    this.annotationInput.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing &&
        event.keyCode !== 229
      ) {
        event.preventDefault();
        this.confirmAnnotation();
      }
    });
    this.annotationEditor.append(
      this.annotationInput,
      button(
        msg("Confirm annotation"),
        () => this.confirmAnnotation(),
        "annotation-inline-confirm",
        "check",
        true,
      ),
      button(
        msg("Cancel annotation"),
        () => this.cancelAnnotation(true),
        "annotation-inline-cancel",
        "close",
        true,
      ),
    );
    document.body.append(this.annotationEditor);
    this.toolbar.hidden = true;
    this.toolbar.setAttribute("role", "toolbar");
    setAttribute(this.toolbar, "aria-label", msg("Selected text actions"));
    const add = button(
      msg("Add to chat"),
      () => {
        if (!this.selection || this.locked) return;
        const { message, text, range } = this.selection;
        this.beginAnnotation(message, text, range);
      },
      "button-with-icon",
      "quote",
    );
    // Keep the text selection alive until the click has captured it.
    add.addEventListener("pointerdown", (event) => event.preventDefault());
    this.toolbar.append(add);
    document.body.append(this.toolbar);
    document.addEventListener("selectionchange", () => this.updateSelection(), {
      signal: this.life.signal,
    });
    document.addEventListener(
      "scroll",
      () => {
        this.updateSelection();
        this.positionPopover();
      },
      {
        capture: true,
        passive: true,
        signal: this.life.signal,
      },
    );
    window.addEventListener(
      "resize",
      () => {
        this.updateSelection();
        this.positionPopover();
      },
      {
        signal: this.life.signal,
      },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && this.pendingAnnotation) {
          event.preventDefault();
          this.cancelAnnotation(true);
          return;
        }
        if (event.key === "Escape" && !this.popover.hidden) {
          event.preventDefault();
          this.hidePopover(true);
        }
        if (event.key === "Escape" && !this.toolbar.hidden) {
          this.hideSelection();
          window.getSelection()?.removeAllRanges();
        }
      },
      { signal: this.life.signal },
    );
  }
  setMessages(messages: readonly MessageView[]) {
    this.messages = new Map(
      messages
        .filter((message) => message.ref.sessionId === this.options.session())
        .map((message) => [message.ref.messageId, message]),
    );
  }
  bind(wrapper: HTMLElement, message: MessageView) {
    let actions = wrapper.querySelector<HTMLElement>(
      ":scope > .message-actions",
    );
    if (message.role === "assistant") {
      if (!actions) {
        actions = node("div", "", "message-actions");
        const current = () => this.messages.get(wrapper.dataset.id!);
        actions.append(
          button(
            msg("Reply"),
            () => {
              const target = current();
              if (!target || this.locked) return;
              this.draft.setReply(target);
              this.changed();
            },
            "message-action",
            "reply",
          ),
        );
        wrapper.append(actions);
      }
      const reply = actions.querySelector<HTMLButtonElement>("button");
      reply!.disabled = this.locked;
    } else actions?.remove();
    const old = wrapper.querySelector<HTMLElement>(
      ":scope > .message-reply-context",
    );
    const signature = message.replyTo ? JSON.stringify(message.replyTo) : "";
    if (old?.dataset.reference !== signature) {
      old?.remove();
      if (message.replyTo) {
        const ref = message.replyTo;
        const context = button(
          msg("Reply to earlier message"),
          () => this.options.open(ref),
          "message-reply-context",
          "reply",
        );
        context.dataset.reference = signature;
        wrapper.insertBefore(context, wrapper.querySelector(".message-bubble"));
      }
    }
  }
  hasPendingAnnotation() {
    return this.pendingAnnotation !== undefined;
  }
  hasQuotes() {
    return this.draft.quotes.length > 0;
  }
  build() {
    return this.draft.build();
  }
  setLocked(locked: boolean) {
    if (this.locked === locked) return;
    this.locked = locked;
    for (const element of [
      ...this.panel.querySelectorAll<HTMLButtonElement>(
        "[data-reference-mutate]",
      ),
      ...this.popover.querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>(
        "[data-reference-mutate], textarea",
      ),
    ])
      element.disabled = locked;
    for (const wrapper of this.options.chat.querySelectorAll<HTMLElement>(
      ".message",
    )) {
      const message = this.messages.get(wrapper.dataset.id!);
      if (message) this.bind(wrapper, message);
    }
    if (locked) {
      this.hideSelection();
      this.hidePopover();
      this.cancelAnnotation(false, false);
    }
  }
  clear(resetMessages = false) {
    this.cancelAnnotation(false, false);
    this.draft = new MessageReferenceDraft(this.options.session());
    if (resetMessages) this.messages.clear();
    this.hideSelection();
    this.hidePopover();
    this.render();
  }
  private changed() {
    this.render();
    this.options.changed();
    this.options.focus();
  }
  private render() {
    this.panel.replaceChildren();
    this.triggers.clear();
    const chip = (
      kind: "reply" | "quotes",
      label: UiLabel,
      removeLabel: UiLabel,
      remove: () => void,
    ) => {
      const group = node("div", "", "chat-reference-chip");
      const trigger = button(
        "",
        () => {
          if (this.openKind === kind && this.pinned) this.hidePopover();
          else this.showPopover(kind, true);
        },
        "chat-reference-trigger",
        kind === "quotes" ? "annotation" : "reply",
      );
      trigger.append(node("span", label, "reference-chip-label"));
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-controls", this.popover.id);
      trigger.setAttribute("aria-expanded", String(this.openKind === kind));
      trigger.addEventListener("focus", () => {
        if (!this.suppressFocusOpen) this.showPopover(kind);
      });
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.showPopover(kind, true);
          this.popover.querySelector<HTMLButtonElement>("button")?.focus();
        }
      });
      const close = button(
        removeLabel,
        remove,
        "chat-reference-remove",
        "close",
        true,
      );
      close.dataset.referenceMutate = "";
      close.disabled = this.locked;
      group.append(trigger, close);
      group.addEventListener("pointerenter", () => this.showPopover(kind));
      group.addEventListener("pointerleave", () => this.scheduleClose());
      this.triggers.set(kind, trigger);
      this.panel.append(group);
    };
    if (this.draft.reply)
      chip(
        "reply",
        msg("Replying to {author}", { author: author(this.draft.reply) }),
        msg("Remove reply"),
        () => {
          this.draft.reply = undefined;
          this.changed();
        },
      );
    if (this.draft.quotes.length)
      chip(
        "quotes",
        msg(
          this.draft.quotes.length === 1
            ? "1 annotation"
            : "{count} annotations",
          { count: this.draft.quotes.length },
        ),
        msg("Remove all annotations"),
        () => {
          this.draft.quotes = [];
          this.changed();
        },
      );
    this.panel.hidden = !this.panel.childElementCount;
    if (this.openKind && this.triggers.has(this.openKind))
      this.showPopover(this.openKind, this.pinned, true);
    else this.hidePopover();
  }
  private showPopover(kind: "reply" | "quotes", pin = false, refresh = false) {
    clearTimeout(this.closeTimer);
    if (this.pendingAnnotation || !this.triggers.has(kind)) return;
    if (this.pinned && this.openKind !== kind && !pin && !refresh) return;
    const changed = this.openKind !== kind;
    if (changed) {
      this.pinned = false;
      this.editing = undefined;
    }
    this.openKind = kind;
    this.pinned ||= pin;
    for (const [key, trigger] of this.triggers)
      trigger.setAttribute("aria-expanded", String(key === kind));
    if (changed || refresh || this.popover.hidden) this.renderPopover();
    this.popover.hidden = false;
    this.positionPopover();
  }
  private renderPopover() {
    this.popover.replaceChildren();
    setAttribute(
      this.popover,
      "aria-label",
      msg(this.openKind === "reply" ? "Reply details" : "Annotations"),
    );
    if (this.openKind === "reply" && this.draft.reply) {
      const message = this.draft.reply;
      this.popover.append(
        node(
          "strong",
          msg("Replying to {author}", { author: author(message) }),
        ),
        node("blockquote", messageText(message)),
      );
      this.popover.append(
        button(
          msg("View original message"),
          () => {
            this.hidePopover();
            this.options.open(message.ref);
          },
          "annotation-source",
        ),
      );
      return;
    }
    for (const [index, item] of this.draft.quotes.entries()) {
      const section = node("section", "", "chat-annotation");
      const heading = node("div", "", "annotation-heading");
      const edit = button(
        msg(item.comment ? "Edit comment" : "Add comment"),
        () => {
          if (this.locked) return;
          this.editing = item.id;
          this.pinned = true;
          this.renderPopover();
          this.positionPopover();
          this.popover.querySelector<HTMLTextAreaElement>("textarea")?.focus();
        },
        "annotation-edit",
        "edit",
        true,
      );
      const remove = button(
        msg("Remove annotation {number}", { number: index + 1 }),
        () => {
          if (this.locked) return;
          this.draft.quotes = this.draft.quotes.filter(
            (quote) => quote !== item,
          );
          if (this.editing === item.id) this.editing = undefined;
          this.render();
          this.options.changed();
          if (!this.draft.quotes.length) this.options.focus();
        },
        "annotation-delete",
        "trash",
        true,
      );
      edit.dataset.referenceMutate = "";
      remove.dataset.referenceMutate = "";
      edit.disabled = remove.disabled = this.locked;
      heading.append(
        node("span", msg("{number}. Selected text", { number: index + 1 })),
        edit,
        remove,
      );
      section.append(heading, node("blockquote", item.text));
      if (this.editing === item.id) {
        const field = node("label", "", "annotation-comment-field");
        const input = node("textarea");
        input.value = item.comment;
        input.disabled = this.locked;
        setAttribute(input, "placeholder", msg("Add your comment…"));
        input.addEventListener("input", () => {
          item.comment = input.value;
          this.options.changed();
        });
        field.append(node("span", msg("Your comment")), input);
        const done = button(
          msg("Done"),
          () => {
            this.editing = undefined;
            this.renderPopover();
            this.positionPopover();
          },
          "annotation-done",
        );
        section.append(field, done);
      } else if (item.comment) {
        section.append(
          node("div", msg("Your comment"), "annotation-comment-label"),
          node("p", item.comment, "annotation-comment"),
        );
      }
      section.append(
        button(
          msg("View original message"),
          () => {
            this.hidePopover();
            this.options.open(item.message.ref);
          },
          "annotation-source",
        ),
      );
      this.popover.append(section);
    }
  }
  private positionPopover() {
    if (this.popover.hidden || !this.openKind) return;
    const anchor = this.triggers.get(this.openKind)?.getBoundingClientRect();
    if (!anchor || anchor.bottom < 0 || anchor.top > window.innerHeight) {
      this.hidePopover();
      return;
    }
    const above = anchor.top - 16,
      below = window.innerHeight - anchor.bottom - 16;
    const upwards = above >= Math.min(260, below);
    this.popover.style.maxHeight = `${Math.max(100, Math.min(420, upwards ? above : below))}px`;
    const rect = this.popover.getBoundingClientRect();
    this.popover.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - rect.width - 12))}px`;
    this.popover.style.top = `${Math.max(8, upwards ? anchor.top - rect.height - 8 : anchor.bottom + 8)}px`;
  }
  private scheduleClose() {
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (!this.pinned && !this.popover.contains(document.activeElement))
        this.hidePopover();
    }, 180);
  }
  private hidePopover(restoreFocus = false) {
    clearTimeout(this.closeTimer);
    const trigger = this.openKind && this.triggers.get(this.openKind);
    this.openKind = undefined;
    this.pinned = false;
    this.editing = undefined;
    this.popover.hidden = true;
    this.popover.replaceChildren();
    for (const button of this.triggers.values())
      button.setAttribute("aria-expanded", "false");
    if (restoreFocus && trigger) {
      this.suppressFocusOpen = true;
      trigger.focus();
      this.suppressFocusOpen = false;
    }
  }
  private beginAnnotation(
    message: MessageView,
    text: string,
    anchor: Range | HTMLElement,
  ) {
    if (
      this.locked ||
      message.role !== "assistant" ||
      message.ref.sessionId !== this.options.session() ||
      !text.trim()
    )
      return;
    if (this.pendingAnnotation) {
      this.annotationInput.focus();
      return;
    }
    this.pendingAnnotation = {
      message: { ...message, ref: { ...message.ref } },
      text,
      anchor,
      rect: anchor.getBoundingClientRect(),
    };
    this.hideSelection();
    this.hidePopover();
    this.annotationInput.value = "";
    this.annotationInput.style.height = "auto";
    this.annotationEditor.hidden = false;
    if (
      anchor instanceof Range &&
      typeof Highlight !== "undefined" &&
      typeof CSS !== "undefined" &&
      CSS.highlights
    )
      CSS.highlights.set("ads-pending-annotation", new Highlight(anchor));
    this.positionAnnotationEditor();
    this.options.changed();
    this.annotationInput.focus({ preventScroll: true });
  }
  private confirmAnnotation() {
    const pending = this.pendingAnnotation;
    if (!pending || this.locked) return;
    const comment = this.annotationInput.value;
    this.cancelAnnotation(false, false);
    this.draft.addQuote(pending.message, pending.text, comment);
    window.getSelection()?.removeAllRanges();
    this.changed();
  }
  private cancelAnnotation(focus = false, notify = true) {
    if (!this.pendingAnnotation) return;
    this.pendingAnnotation = undefined;
    this.annotationEditor.hidden = true;
    this.annotationInput.value = "";
    if (typeof CSS !== "undefined" && CSS.highlights)
      CSS.highlights.delete("ads-pending-annotation");
    if (notify) this.options.changed();
    if (focus) this.options.focus();
  }
  private positionAnnotationEditor() {
    const pending = this.pendingAnnotation;
    if (!pending || this.annotationEditor.hidden) return;
    const live = pending.anchor.getBoundingClientRect();
    if (live.height > 0) pending.rect = live;
    const rect = pending.rect,
      viewport = this.options.viewport.getBoundingClientRect();
    this.annotationEditor.style.width = `${Math.max(120, Math.min(380, viewport.width - 8, window.innerWidth - 24))}px`;
    const bounds = this.annotationEditor.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(
        Math.max(viewport.left + 4, rect.left),
        window.innerWidth - bounds.width - 8,
        viewport.right - bounds.width - 4,
      ),
    );
    const above = rect.top - bounds.height - 8;
    const preferred = above >= viewport.top + 4 ? above : rect.bottom + 8;
    const top = Math.max(
      8,
      viewport.top + 4,
      Math.min(
        preferred,
        viewport.bottom - bounds.height - 4,
        window.innerHeight - bounds.height - 8,
      ),
    );
    this.annotationEditor.style.left = `${left}px`;
    this.annotationEditor.style.top = `${top}px`;
  }
  private hideSelection() {
    this.selection = undefined;
    this.toolbar.hidden = true;
  }
  private updateSelection() {
    if (this.pendingAnnotation) {
      this.positionAnnotationEditor();
      return;
    }
    if (this.locked) return this.hideSelection();
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !selection.rangeCount ||
      !selection.toString().trim()
    )
      return this.hideSelection();
    const range = selection.getRangeAt(0);
    const element = (node: Node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    const start = element(range.startContainer),
      end = element(range.endContainer);
    const messageElement = start?.closest<HTMLElement>(".message");
    if (
      !messageElement ||
      !this.options.chat.contains(messageElement) ||
      end?.closest(".message") !== messageElement ||
      !start?.closest(".part-text") ||
      !end?.closest(".part-text")
    )
      return this.hideSelection();
    const message = this.messages.get(messageElement.dataset.id!);
    if (!message || message.role !== "assistant") return this.hideSelection();
    const rect = range.getBoundingClientRect(),
      viewport = this.options.viewport.getBoundingClientRect();
    if (rect.bottom < viewport.top || rect.top > viewport.bottom)
      return this.hideSelection();
    this.selection = {
      message,
      text: selection.toString(),
      range: range.cloneRange(),
    };
    this.toolbar.hidden = false;
    const bounds = this.toolbar.getBoundingClientRect();
    this.toolbar.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - bounds.width - 8))}px`;
    this.toolbar.style.top = `${Math.max(8, Math.max(viewport.top, rect.top) - bounds.height - 6)}px`;
  }
  destroy() {
    this.cancelAnnotation(false, false);
    this.life.abort();
    clearTimeout(this.closeTimer);
    this.panel.remove();
    this.toolbar.remove();
    this.popover.remove();
    this.annotationEditor.remove();
    this.messages.clear();
  }
}

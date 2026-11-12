import { msg } from "./i18n.js";
import { Message, type MessageDraft, type ResourceLink } from "@nuva/sdk";
import { byId, node } from "./ui.js";
export type ComposerPart =
  | { type: "text"; text: string }
  | { type: "quote"; record: ResourceLink };
export function readParts(
  root: Node,
  references: ReadonlyMap<string, ResourceLink>,
): ComposerPart[] {
  const parts: ComposerPart[] = [];
  const text = (value: string) => {
    const last = parts.at(-1);
    if (last?.type === "text") last.text += value;
    else parts.push({ type: "text", text: value });
  };
  const walk = (element: Node) => {
    if (element.nodeType === Node.TEXT_NODE) {
      text(element.textContent ?? "");
      return;
    }
    if (!(element instanceof HTMLElement)) {
      element.childNodes.forEach(walk);
      return;
    }
    if (element.dataset.mention) {
      const record = references.get(element.dataset.mention);
      if (record) parts.push({ type: "quote", record });
      return;
    }
    if (element.tagName === "BR") {
      text("\n");
      return;
    }
    const block = ["DIV", "P"].includes(element.tagName);
    if (block && element !== root && element.previousSibling) text("\n");
    element.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return parts;
}
export function buildDraft(parts: readonly ComposerPart[], base: MessageDraft = Message.create()): MessageDraft {
  return parts.reduce(
    (draft, part) =>
      part.type === "quote" ? draft.quote(part.record) : draft.text(part.text),
    base,
  );
}
export class Composer {
  readonly editor = byId<HTMLDivElement>("message");
  private picker = byId("mentions");
  private references = new Map<string, ResourceLink>();
  private options: ResourceLink[] = [];
  private active = 0;
  private queryRange?: Range;
  private savedRange?: Range;
  private locked = true;
  private life = new AbortController();
  onSend: () => void = () => {};
  onChange: () => void = () => {};
  constructor(private resources: () => readonly ResourceLink[]) {
    this.editor.addEventListener(
      "input",
      () => {
        this.search();
        this.onChange();
      },
      { signal: this.life.signal },
    );
    this.editor.addEventListener("keyup", () => this.rememberCaret(), {
      signal: this.life.signal,
    });
    this.editor.addEventListener("mouseup", () => this.rememberCaret(), {
      signal: this.life.signal,
    });
    this.editor.addEventListener(
      "keydown",
      (event) => {
        if (event.isComposing || event.keyCode === 229) return;
        if (!this.picker.hidden) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            this.active =
              (this.active +
                (event.key === "ArrowDown" ? 1 : -1) +
                this.options.length) %
              Math.max(1, this.options.length);
            this.drawOptions();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            this.close();
            return;
          }
          if (event.key === "Enter" && !event.shiftKey && this.options.length) {
            event.preventDefault();
            this.choose(this.options[this.active]);
            return;
          }
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          this.close();
          this.onSend();
        }
      },
      { signal: this.life.signal },
    );
    this.editor.addEventListener(
      "paste",
      (event) => {
        event.preventDefault();
        this.insertText(event.clipboardData?.getData("text/plain") ?? "");
      },
      { signal: this.life.signal },
    );
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (
          !this.picker.contains(event.target as Node) &&
          !this.editor.contains(event.target as Node)
        )
          this.close();
      },
      { signal: this.life.signal },
    );
    byId("mention-button").onclick = () => {
      if (this.locked) return;
      this.focus();
      this.insertText("@");
    };
  }
  private rememberCaret() {
    const selection = window.getSelection();
    if (selection?.rangeCount && this.editor.contains(selection.anchorNode))
      this.savedRange = selection.getRangeAt(0).cloneRange();
  }
  focus() {
    this.editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range =
      this.savedRange && this.editor.contains(this.savedRange.startContainer)
        ? this.savedRange.cloneRange()
        : document.createRange();
    if (
      range !== this.savedRange &&
      !this.editor.contains(range.startContainer)
    ) {
      range.selectNodeContents(this.editor);
      range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
  private insertText(value: string) {
    if (this.locked) return;
    this.focus();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const text = document.createTextNode(value);
    range.insertNode(text);
    range.setStart(text, text.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.rememberCaret();
    this.search();
    this.onChange();
  }
  private search() {
    this.rememberCaret();
    const selection = window.getSelection();
    if (
      !selection?.isCollapsed ||
      !selection.anchorNode ||
      selection.anchorNode.nodeType !== Node.TEXT_NODE ||
      !this.editor.contains(selection.anchorNode)
    )
      return this.close();
    const before =
      selection.anchorNode.textContent?.slice(0, selection.anchorOffset) ?? "";
    const query = /(?:^|\s)@([^@\s]*)$/.exec(before);
    if (!query) return this.close();
    const text = query[1].toLowerCase();
    const seen = new Set<string>();
    this.options = this.resources()
      .filter((record) => {
        const key = `${record.ref.kind}:${record.ref.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return `${record.label} ${record.ref.kind} ${record.ref.id}`
          .toLowerCase()
          .includes(text);
      })
      .slice(0, 8);
    const range = document.createRange();
    range.setStart(
      selection.anchorNode,
      selection.anchorOffset - query[1].length - 1,
    );
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    this.queryRange = range;
    this.active = 0;
    this.picker.hidden = false;
    this.editor.setAttribute("aria-expanded", "true");
    this.editor.setAttribute("aria-controls", "mentions");
    this.drawOptions();
  }
  private drawOptions() {
    this.picker.replaceChildren();
    if (!this.options.length)
      this.picker.append(
        node(
          "p",
          msg("No matching resources. Select or create a product first."),
          "empty",
        ),
      );
    this.options.forEach((record, index) => {
      const option = node("button", "", "mention-option");
      option.type = "button";
      option.id = `mention-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === this.active));
      option.append(
        node("span", msg(record.ref.kind), "mention-kind"),
        node("span", record.label, "mention-label"),
      );
      option.onpointerdown = (event) => event.preventDefault();
      option.onclick = () => this.choose(record);
      this.picker.append(option);
    });
    if (this.options.length)
      this.editor.setAttribute(
        "aria-activedescendant",
        `mention-option-${this.active}`,
      );
  }
  private choose(record: ResourceLink) {
    const range = this.queryRange;
    if (range) {
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      this.savedRange = range;
    }
    this.insertResource(record);
  }
  insertResource(record: ResourceLink) {
    if (this.locked) return;
    this.focus();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.startContainer)) return;
    range.deleteContents();
    const key = crypto.randomUUID();
    this.references.set(key, record);
    const chip = node("span", `@${record.label}`, "mention-chip");
    chip.contentEditable = "false";
    chip.dataset.mention = key;
    chip.title = `${record.ref.kind}: ${record.ref.id}`;
    range.insertNode(chip);
    const space = document.createTextNode(" ");
    chip.after(space);
    range.setStart(space, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.rememberCaret();
    this.close();
    this.onChange();
  }
  insertPrompt(text: string) {
    if (!this.locked) this.insertText(text);
  }
  parts() {
    return readParts(this.editor, this.references);
  }
  empty() {
    return !this.parts().some(
      (part) => part.type === "quote" || part.text.trim(),
    );
  }
  clear() {
    this.editor.replaceChildren();
    this.references.clear();
    this.savedRange = undefined;
    this.close();
    this.onChange();
  }
  setLocked(value: boolean) {
    this.locked = value;
    this.editor.contentEditable = String(!value);
    this.editor.setAttribute("aria-disabled", String(value));
    byId<HTMLButtonElement>("mention-button").disabled = value;
    if (value) this.close();
  }
  destroy() {
    this.life.abort();
    this.close();
  }
  private close() {
    this.picker.hidden = true;
    this.queryRange = undefined;
    this.editor.setAttribute("aria-expanded", "false");
    this.editor.removeAttribute("aria-activedescendant");
  }
}

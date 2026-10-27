import { Marked } from "marked";
import createDOMPurify from "dompurify";

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const markdown = new Marked({
  gfm: true,
  breaks: false,
  // Treat model-authored HTML and reference tags as text, not page instructions.
  renderer: { html: ({ text }) => escapeHtml(text) },
});
const purifiers = new WeakMap<Window, ReturnType<typeof createDOMPurify>>();

export function renderMarkdown(element: HTMLElement, text: string) {
  const window = element.ownerDocument.defaultView;
  if (!window) throw new Error("Markdown rendering requires a document window.");
  let purifier = purifiers.get(window);
  if (!purifier) {
    purifier = createDOMPurify(window);
    purifiers.set(window, purifier);
  }
  const html = markdown.parse(text, { async: false });
  const fragment = purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["form", "input", "button", "textarea", "select", "style"],
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
  });
  element.classList.add("markdown-content");
  element.replaceChildren(fragment);
  for (const table of element.querySelectorAll("table")) {
    const scroll = element.ownerDocument.createElement("div");
    scroll.className = "markdown-table-scroll";
    scroll.tabIndex = 0;
    table.replaceWith(scroll);
    scroll.append(table);
  }
  for (const link of element.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    link.rel = "noopener noreferrer";
    link.target = "_blank";
  }
}

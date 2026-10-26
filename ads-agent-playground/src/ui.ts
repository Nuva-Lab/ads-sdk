/** DOM helpers deliberately render service/model data as text, never HTML. */
export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element as T;
}
export function button(label: string, action: () => unknown, className = "") {
  const element = node("button", label, className);
  element.type = "button";
  element.onclick = () => void action();
  return element;
}
export function field(label: string, value = "", multiline = false) {
  const wrapper = node("label", "", "field");
  const input = multiline ? node("textarea") : node("input");
  input.value = value;
  wrapper.append(node("span", label), input);
  return { wrapper, input };
}
export function details(title: string, value: unknown, key = title) {
  const element = node("details");
  element.dataset.disclosureKey = key;
  element.append(
    node("summary", title),
    node("pre", JSON.stringify(value, null, 2)),
  );
  return element;
}
export function notice(message: string, error = false) {
  const el = byId("notice");
  el.textContent = message;
  el.className = error ? "notice error" : "notice";
  el.hidden = false;
}
export function report(error: unknown) {
  const value = error as {
    code?: string;
    message?: string;
    asset?: { id?: string };
  };
  notice(
    `${value.code ? value.code + ": " : ""}${value.message ?? String(error)}${value.asset?.id ? ` Uploaded Asset retained: ${value.asset.id}.` : ""}`,
    true,
  );
}
export async function action<T>(run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    report(error);
    return undefined;
  }
}
export function media(url: string, kind: "image" | "video") {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Unsupported media URL.");
  if (kind === "image") {
    const image = node("img");
    image.src = url;
    image.alt = "Product reference";
    image.onerror = () => {
      image.alt = "Image unavailable. Refresh to reload.";
    };
    image.loading = "lazy";
    return image;
  }
  const video = node("video");
  video.src = url;
  video.controls = true;
  video.preload = "metadata";
  return video;
}

/** Snapshot before a synchronous redraw; restore by identity, never by list position or repeated title. */
export function preserveDisclosures(
  container: Pick<HTMLElement, "querySelectorAll">,
): () => void {
  const states = new Map(
    Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        "details[data-disclosure-key]",
      ),
    ).map((element) => [element.dataset.disclosureKey!, element.open]),
  );
  return () => {
    for (const element of Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        "details[data-disclosure-key]",
      ),
    )) {
      const state = states.get(element.dataset.disclosureKey!);
      if (state !== undefined) element.open = state;
    }
  };
}

export function showPane(view: "workspace" | "chat") {
  document.body.dataset.mobileView = view;
  for (const kind of ["workspace", "chat"]) {
    const button = document.getElementById(`mobile-${kind}`);
    button?.classList.toggle("active", view === kind);
    button?.setAttribute("aria-pressed", String(view === kind));
  }
}

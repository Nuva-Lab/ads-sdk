import type { UiLabel } from "./i18n.js";
import { msg, setAttribute } from "./i18n.js";
import type { Prompt, JobState } from "@nuva/sdk";
import { action, button, media, modal, node, notice } from "./ui.js";
import { icon } from "./icons.js";

type MediaKind = "image" | "video" | "audio";
export interface PromptReference {
  key: string;
  kind: MediaKind;
  index: number;
  label: string;
  assetId: string;
  asset?: Prompt["assets"][string];
  color: number;
}
export function promptReferences(
  prompt: Pick<Prompt, "data" | "assets">,
): PromptReference[] {
  const references: PromptReference[] = [];
  for (const [kind, ids] of [
    ["image", prompt.data.image_asset_ids],
    ["video", prompt.data.video_asset_ids],
    ["audio", prompt.data.audio_asset_ids],
  ] as const) {
    for (const [offset, assetId] of (ids ?? []).entries()) {
      const index = offset + 1,
        asset = prompt.assets[assetId];
      references.push({
        key: `${kind}:${index}`,
        kind,
        index,
        assetId,
        label: `${kind === "image" ? "Image" : kind === "video" ? "Video" : "Audio"} ${index}`,
        color: references.length % 6,
        ...(asset?.kind === kind ? { asset } : {}),
      });
    }
  }
  return references;
}
const sectionNames: Record<string, string> = {
  subject_definitions: "Subjects",
  summary: "Summary",
  retention_analysis: "Reference preservation",
  detailed_description: "Scene and motion",
  overall_soundscape: "Sound",
  non_diegetic_music: "Music",
};
export function promptSections(text: string) {
  const matches = [
    ...text.matchAll(
      /^(subject_definitions|summary|retention_analysis|detailed_description|overall_soundscape|non_diegetic_music):[ \t]*/gim,
    ),
  ];
  if (!matches.length) return [{ key: "prompt", title: "Prompt", body: text }];
  const result: { key: string; title: string; body: string }[] = [];
  if (text.slice(0, matches[0].index).trim())
    result.push({
      key: "prompt",
      title: "Prompt",
      body: text.slice(0, matches[0].index),
    });
  for (const [i, match] of matches.entries()) {
    const key = match[1].toLowerCase();
    result.push({
      key,
      title: sectionNames[key],
      body: text.slice(
        match.index! + match[0].length,
        matches[i + 1]?.index ?? text.length,
      ),
    });
  }
  return result;
}
export function promptTokens(text: string) {
  const result: {
    kind: "text" | "image" | "video" | "audio" | "subject" | "shot";
    raw: string;
    index?: number;
  }[] = [];
  const matcher =
    /<(Picture|Image|Video|Audio|Subject)\s+(\d+)>|\[(Shot)\s+(\d+)\]/gi;
  let last = 0;
  for (const match of text.matchAll(matcher)) {
    if (match.index! > last)
      result.push({ kind: "text", raw: text.slice(last, match.index) });
    const name = (match[1] ?? match[3]).toLowerCase();
    result.push({
      kind: (name === "picture" ? "image" : name) as
        | "image"
        | "video"
        | "audio"
        | "subject"
        | "shot",
      index: Number(match[2] ?? match[4]),
      raw: match[0],
    });
    last = match.index! + match[0].length;
  }
  if (last < text.length) result.push({ kind: "text", raw: text.slice(last) });
  return result;
}
/** Subject numbers are semantic identities, never implicit image positions. */
export function subjectReferences(text: string, references: PromptReference[]) {
  const declarations = new Map<number, Set<string>>();
  for (const section of promptSections(text).filter(
    (s) => s.key === "subject_definitions",
  )) {
    const starts = [
      ...section.body.matchAll(/^[ \t]*<Subject\s+(\d+)>\s*(?:is\b|:|=)/gim),
    ];
    for (const [i, start] of starts.entries()) {
      const id = Number(start[1]),
        keys = declarations.get(id) ?? new Set<string>();
      const body = section.body.slice(
        start.index! + start[0].length,
        starts[i + 1]?.index ?? section.body.length,
      );
      for (const token of promptTokens(body))
        if (["image", "video", "audio"].includes(token.kind))
          keys.add(`${token.kind}:${token.index}`);
      declarations.set(id, keys);
    }
  }
  const result = new Map<number, PromptReference>();
  for (const [id, keys] of declarations)
    if (keys.size === 1) {
      const ref = references.find((r) => r.key === [...keys][0]);
      if (ref) result.set(id, ref);
    }
  return result;
}
export function jobSettings(
  job: Pick<JobState, "checkpoint" | "seed" | "resolution" | "status">,
) {
  return [
    ["Model", job.checkpoint ?? "Not recorded"],
    ["Resolution", job.resolution ?? "Default"],
    ["Seed", String(job.seed)],
    ["Status", job.status],
  ] as const;
}
function referenceLabel(label: string): UiLabel {
  let match = /^(Image|Video|Audio) (\d+)$/.exec(label);
  if (match) return msg(`${match[1]} {index}`, { index: Number(match[2]) });
  match = /^S(\d+) · (Img|Vid|Aud) (\d+)$/.exec(label);
  if (match)
    return msg(`S{subject} · ${match[2]} {index}`, {
      subject: Number(match[1]),
      index: Number(match[3]),
    });
  match = /^S(\d+)$/.exec(label);
  if (match) return msg("S{subject}", { subject: Number(match[1]) });
  if (label.endsWith(" · missing"))
    return msg("{label} · missing", {
      label: referenceLabel(label.slice(0, -10)),
    });
  return label;
}
export function renderPromptViewer(container: HTMLElement, prompt: Prompt) {
  const references = promptReferences(prompt),
    subjects = subjectReferences(prompt.data.prompt, references);
  const viewer = node("div", "", "prompt-viewer prompt-layout");
  const contentPanel = node("section", "", "prompt-document");
  setAttribute(contentPanel, "aria-label", msg("Prompt content"));
  contentPanel.append(node("h3", msg("Prompt"), "prompt-panel-title"));
  const configuration = node("aside", "", "prompt-configuration");
  setAttribute(configuration, "aria-label", msg("Prompt configuration"));
  configuration.append(node("h3", msg("Configuration"), "prompt-panel-title"));
  viewer.append(contentPanel, configuration);
  const metadata = node("div", "", "config-pills");
  const setting = (label: string, value: import("./i18n.js").UiLabel) => {
    const pill = node("span", "", "config-pill");
    pill.append(
      node("span", msg(label), "config-label"),
      node("strong", value),
    );
    return pill;
  };
  metadata.append(
    setting(
      "Duration",
      prompt.data.seconds == null
        ? msg("Unspecified")
        : msg("{seconds}s", { seconds: prompt.data.seconds }),
    ),
    setting("Ratio", prompt.data.ratio ?? msg("Unspecified")),
  );
  configuration.append(metadata);
  const popover = node("div", "", "asset-popover");
  popover.setAttribute("popover", "auto");
  popover.setAttribute("role", "dialog");
  function preview(ref: PromptReference, anchor: HTMLElement) {
    if (!ref.asset) return;
    popover.hidePopover();
    popover.replaceChildren();
    setAttribute(popover, "aria-label", referenceLabel(ref.label));
    const header = node("div", "", "asset-popover-heading");
    header.append(
      node("strong", referenceLabel(ref.label)),
      button(
        msg("Close"),
        () => popover.hidePopover(),
        "icon-button",
        "close",
        true,
      ),
    );
    popover.append(header);
    if (ref.kind === "audio") {
      const audio = node("audio");
      audio.controls = true;
      audio.src = ref.asset.download_url;
      popover.append(audio);
    } else popover.append(media(ref.asset.download_url, ref.kind));
    popover.showPopover();
    const rect = anchor.getBoundingClientRect(),
      box = popover.getBoundingClientRect();
    popover.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - box.width - 12))}px`;
    popover.style.top = `${Math.max(12, rect.bottom + 8 + box.height < innerHeight - 12 ? rect.bottom + 8 : rect.top - box.height - 8)}px`;
  }
  popover.addEventListener("toggle", () => {
    if (!popover.matches(":popover-open"))
      for (const player of popover.querySelectorAll("video,audio"))
        (player as HTMLMediaElement).pause();
  });
  function chip(
    ref: PromptReference | undefined,
    label: string,
    semantic = false,
  ) {
    const item = button(
      referenceLabel(label),
      () => {
        if (ref) preview(ref, item);
      },
      "reference-chip",
    );
    item.dataset.color = String(ref?.color ?? 5);
    setAttribute(
      item,
      "aria-label",
      ref
        ? msg("{p0}: preview {p1}", {
            p0: referenceLabel(label),
            p1: referenceLabel(ref.label),
          })
        : referenceLabel(label),
    );
    setAttribute(
      item,
      "title",
      ref?.asset
        ? msg("Preview {p0}", { p0: referenceLabel(ref.label) })
        : ref
          ? msg("{p0} unavailable", { p0: referenceLabel(ref.label) })
          : referenceLabel(label),
    );
    const visual = node("span", "", "reference-thumb");
    if (ref?.asset && ref.kind === "image") {
      const image = media(ref.asset.download_url, "image");
      image.setAttribute("alt", "");
      visual.append(image);
    } else if (ref?.asset && ref.kind === "video") {
      const video = node("video");
      video.src = ref.asset.download_url;
      video.muted = true;
      video.preload = "metadata";
      visual.append(video, icon("video"));
    } else visual.append(icon(ref?.kind ?? (semantic ? "subject" : "image")));
    item.prepend(visual);
    if (!ref?.asset) {
      item.disabled = true;
      item.classList.add("reference-unavailable");
    }
    return item;
  }
  if (references.length) {
    const strip = node("div", "", "reference-strip");
    setAttribute(strip, "aria-label", msg("Reference assets"));
    for (const ref of references) strip.append(chip(ref, ref.label));
    configuration.append(
      node("h4", msg("Reference inputs"), "prompt-config-heading"),
      strip,
    );
  }
  const generation = node("div", "", "generation-settings");
  generation.append(setting("Model", msg("Not recorded")));
  configuration.append(
    node("h4", msg("Generation settings"), "prompt-config-heading"),
    generation,
  );
  for (const section of promptSections(prompt.data.prompt)) {
    const element = node("section", "", "prompt-section");
    if (section.key !== "prompt")
      element.append(node("h3", msg(section.title)));
    const body = node("div", "", "prompt-copy");
    for (const token of promptTokens(section.body.trim())) {
      if (token.kind === "text")
        body.append(document.createTextNode(token.raw));
      else if (token.kind === "shot")
        body.append(
          node("span", msg("Shot {p0}", { p0: token.index! }), "shot-chip"),
        );
      else if (token.kind === "subject") {
        const ref = subjects.get(token.index!);
        body.append(
          chip(
            ref,
            ref
              ? `S${token.index} · ${ref.kind === "image" ? "Img" : ref.kind === "video" ? "Vid" : "Aud"} ${ref.index}`
              : `S${token.index}`,
            true,
          ),
        );
      } else {
        const ref = references.find(
          (r) => r.key === `${token.kind}:${token.index}`,
        );
        body.append(
          chip(
            ref,
            ref?.label ??
              `${token.kind === "image" ? "Image" : token.kind === "video" ? "Video" : "Audio"} ${token.index} · missing`,
          ),
        );
      }
    }
    element.append(body);
    contentPanel.append(element);
  }
  viewer.append(popover);
  container.append(viewer);
  return {
    showRaw() {
      if (popover.matches(":popover-open")) popover.hidePopover();
      const popup = modal(container, msg("Raw prompt"));
      popup.dialog.classList.add("raw-prompt-dialog");
      const raw = node("pre", prompt.data.prompt, "raw-prompt-text");
      raw.tabIndex = 0;
      setAttribute(raw, "aria-label", msg("Raw prompt text"));
      const actions = node("div", "", "raw-prompt-actions");
      actions.append(
        button(
          msg("Copy prompt"),
          () =>
            action(async () => {
              await navigator.clipboard.writeText(prompt.data.prompt);
              notice(msg("Prompt copied."));
            }),
          "",
          "copy",
        ),
      );
      popup.body.append(raw, actions);
    },
    setJobs(jobs: JobState[], incomplete = false) {
      if (!viewer.isConnected) return;
      generation.replaceChildren();
      if (!jobs.length)
        generation.append(setting("Model", msg("Not recorded")));
      for (const [index, job] of jobs.entries()) {
        const row = node("div", "", "generation-config");
        if (jobs.length > 1)
          row.append(
            node(
              "span",
              msg("Generation {p0}", { p0: index + 1 }),
              "config-label",
            ),
          );
        for (const [label, value] of jobSettings(job))
          row.append(
            setting(
              label,
              label === "Status" ||
                (label === "Model" && job.checkpoint === null) ||
                (label === "Resolution" && job.resolution === null)
                ? msg(value)
                : value,
            ),
          );
        generation.append(row);
      }
      if (incomplete)
        generation.append(
          node(
            "span",
            msg("Some generation settings could not be loaded."),
            "muted",
          ),
        );
    },
  };
}

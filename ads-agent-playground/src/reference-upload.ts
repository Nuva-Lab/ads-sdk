/**
 * Uploads reference files (images, videos, audio, and in chat documents: PDF, Word and Excel) as Assets, each with an
 * optional label and description: the Agent and the writers read those to know what a file shows. Chat attaches the
 * uploaded Assets to the next message; the Storyboard editor names one in a shot with `{{asset:<id>}}`, which takes no
 * document.
 */
import type { Asset, NuvaClient } from "@nuva/sdk";
import { msg, setAttribute, type UiLabel } from "./i18n.js";
import { button, field, modal, node, notice, showError } from "./ui.js";

export type ReferenceKind = "image" | "video" | "audio" | "document";
/** The types the service accepts, by MIME type and, for files the browser gives no type, by extension. */
const TYPES: Readonly<Record<string, ReferenceKind>> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/wave": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio",
  "application/pdf": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
};
const EXTENSIONS: Readonly<Record<string, ReferenceKind>> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  mp4: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  pdf: "document",
  docx: "document",
  xlsx: "document",
};
/** The file chooser's types; documents (PDF, Word, Excel) only where `documents` (chat). */
export const referenceAccept = (documents: boolean) =>
  [...Object.entries(TYPES), ...Object.entries(EXTENSIONS).map(([extension, kind]) => [`.${extension}`, kind] as const)]
    .filter(([, kind]) => documents || kind !== "document")
    .map(([type]) => type)
    .join(",");
/** A file's kind: by its MIME type, else by its extension; undefined when the service does not accept it. */
export function referenceKind(file: Pick<File, "name" | "type">): ReferenceKind | undefined {
  const type = file.type.toLowerCase();
  if (type) return TYPES[type] ?? (type === "application/octet-stream" ? byExtension(file.name) : undefined);
  return byExtension(file.name);
}
const byExtension = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? undefined : EXTENSIONS[name.slice(dot + 1).toLowerCase()];
};
const KIND_LABELS: Record<ReferenceKind, string> = { image: "Image", video: "Video", audio: "Audio", document: "Document" };
export const kindLabel = (kind: ReferenceKind) => msg(KIND_LABELS[kind]);

export interface UploadedReference {
  asset: Asset;
  file: File;
  /** The label the user gave, or the file name. */
  label: string;
}
type Row = { file: File; kind: ReferenceKind; label: HTMLInputElement; description: HTMLTextAreaElement; uploaded?: Asset };

/**
 * A file chooser and the dialog that uploads what was chosen. `open(done)` opens the chooser; after the user
 * describes the files and uploads them, `done` gets the Assets in the order chosen. Cancelling uploads nothing more.
 */
export function referencePicker(options: {
  sdk: Pick<NuvaClient, "assets">;
  /** Where the hidden file input and the dialog go. */
  container: () => HTMLElement;
  multiple: boolean;
  title: UiLabel;
  /** Documents too (PDF, Word, Excel), for the Agent to read (chat); a shot cannot use one. */
  documents?: boolean;
}) {
  const documents = options.documents ?? false;
  const kindOf = (file: File) => {
    const kind = referenceKind(file);
    return kind === "document" && !documents ? undefined : kind;
  };
  const input = node("input");
  input.type = "file";
  input.accept = referenceAccept(documents);
  input.multiple = options.multiple;
  input.hidden = true;
  input.name = "reference-files";
  setAttribute(input, "aria-label", options.title);
  let pending: ((uploaded: UploadedReference[]) => void) | undefined;
  input.onchange = () => {
    const files = Array.from(input.files ?? []);
    input.value = "";
    const done = pending;
    pending = undefined;
    if (done && files.length) describe(files, done);
  };
  function describe(files: File[], done: (uploaded: UploadedReference[]) => void) {
    const accepted = files.filter((file) => kindOf(file) !== undefined);
    const refused = files.filter((file) => kindOf(file) === undefined);
    const names = refused.map((file) => file.name).join(", ");
    const refusal = !refused.length
      ? undefined
      : documents
        ? msg("Not a supported file: {p0}. Use PNG, JPEG or WebP images, MP4 videos, MP3, WAV or M4A audio, or PDF, Word (.docx) or Excel (.xlsx) documents.", { p0: names })
        : msg("Not a supported file: {p0}. Use PNG, JPEG or WebP images, MP4 videos, or MP3, WAV or M4A audio.", { p0: names });
    // With nothing to upload there is no dialog, so the page's notice says it; otherwise the dialog does, since an
    // open dialog covers the notice.
    if (!accepted.length) {
      if (refusal) notice(refusal, true);
      return;
    }
    const popup = modal(options.container(), options.title);
    popup.dialog.classList.add("reference-upload");
    // Closed by the user: an upload still running finishes, but nothing is attached or inserted.
    let dismissed = false;
    popup.dialog.addEventListener("close", () => (dismissed = true), { once: true });
    const rows: Row[] = [];
    // While files upload the list is fixed: no file is removed and no text changes under the running upload.
    let uploading = false;
    const list = node("div", "", "reference-upload-list");
    const draw = () => {
      list.replaceChildren(
        ...rows.map((row, index) => {
          const item = node("div", "", "reference-upload-row");
          item.dataset.kind = row.kind;
          const head = node("div", "", "reference-upload-head");
          head.append(node("span", kindLabel(row.kind), "badge"), node("span", row.file.name, "resource-id"));
          if (row.uploaded) head.append(node("span", msg("Uploaded"), "muted"));
          else {
            const remove = button(msg("Remove {p0}", { p0: row.file.name }), () => {
              if (uploading) return;
              rows.splice(index, 1);
              if (!rows.length) popup.close();
              else draw();
            }, "icon-button", "close", true);
            remove.disabled = uploading;
            head.append(remove);
          }
          row.label.disabled = row.description.disabled = uploading || !!row.uploaded;
          item.append(head, row.label.parentElement!, row.description.parentElement!);
          return item;
        }),
      );
    };
    accepted.forEach((file, index) => {
      const label = field(msg("Label (optional)")),
        description = field(msg("Description (optional)"), "", true);
      label.input.name = `reference-label-${index}`;
      description.input.name = `reference-description-${index}`;
      (description.input as HTMLTextAreaElement).rows = 2;
      rows.push({ file, kind: kindOf(file)!, label: label.input as HTMLInputElement, description: description.input as HTMLTextAreaElement });
    });
    draw();
    const failure = node("div", "", "storyboard-error");
    failure.hidden = true;
    const upload = node("button", msg("Upload"), "primary");
    upload.type = "submit";
    const actions = node("div", "", "form-actions");
    actions.append(button(msg("Cancel"), () => popup.close()), upload);
    const form = node("form", "", "reference-upload-form");
    form.append(
      node("p", msg("Ads Agent and the writers read each file's label and description to know what it shows."), "muted"),
      ...(refusal ? [node("p", refusal, "reference-upload-refused")] : []),
      list,
      failure,
      actions,
    );
    form.onsubmit = (event) => {
      event.preventDefault();
      void send();
    };
    popup.body.append(form);
    async function send() {
      if (uploading) return;
      uploading = true;
      upload.disabled = true;
      failure.hidden = true;
      draw();
      try {
        // Each file uploads once: a retry after a failure continues with the rest.
        for (const row of [...rows]) {
          if (row.uploaded) continue;
          const label = row.label.value.trim(),
            description = row.description.value.trim();
          row.uploaded = await options.sdk.assets.upload(row.file, {
            kind: row.kind,
            ...(label ? { label } : {}),
            ...(description ? { description } : {}),
          });
          draw();
        }
      } catch (error) {
        showError(failure, error);
        upload.disabled = false;
        return;
      } finally {
        uploading = false;
        draw();
      }
      if (dismissed || rows.some((row) => !row.uploaded)) return;
      popup.close();
      // The Asset's own label: the one just given, or, for a file uploaded before with none given now, its earlier one.
      done(rows.map((row) => ({ asset: row.uploaded!, file: row.file, label: row.uploaded!.label?.trim() || row.file.name })));
    }
  }
  return {
    input,
    open(done: (uploaded: UploadedReference[]) => void) {
      if (!input.isConnected) options.container().append(input);
      pending = done;
      input.click();
    },
  };
}

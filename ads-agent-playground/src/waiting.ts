import type { ResourceLink, SessionWaiting } from "@nuva/sdk";
import { msg, onLocaleChange, resolveLabel, type UiText } from "./i18n.js";

/** The bar's summary: how many renders, when they usually finish, and that the Agent continues on its own. */
export function waitingSummary(waiting: SessionWaiting, now: number): UiText[] {
  const count = waiting.jobs.length;
  const parts: UiText[] = [count === 1 ? msg("Waiting for 1 render") : msg("Waiting for {p0} renders", { p0: count })];
  if (waiting.estimated_done_at !== undefined) {
    const left = Date.parse(waiting.estimated_done_at) - now;
    // "Usually" is this customer's median; past it, say so instead of a negative time.
    parts.push(left > 0 ? msg("usually about {p0} min", { p0: Math.max(1, Math.ceil(left / 60000)) }) : msg("taking longer than usual"));
  }
  parts.push(count === 1 ? msg("The Agent continues when it finishes") : msg("The Agent continues when they finish"));
  return parts;
}
export const waitingStatus = (status: "queued" | "running") => (status === "running" ? msg("rendering") : msg("queued"));

export interface WaitingBarElements {
  bar: HTMLElement;
  text: HTMLElement;
  jobs: HTMLElement;
  stop: HTMLButtonElement;
}
/**
 * The bar above the composer while the Session waits for renders. It never locks chat: the user can keep talking, open
 * a Job's card from its chip, or Stop waiting (the Session's Stop, which cancels the pending wake-ups).
 */
export class WaitingBar {
  private waiting: SessionWaiting | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly unsubscribe: () => void;
  constructor(
    private readonly elements: WaitingBarElements,
    private readonly actions: { open(record: ResourceLink): void; stop(): Promise<unknown>; now?: () => number },
  ) {
    this.unsubscribe = onLocaleChange(() => this.render());
    elements.stop.onclick = () => {
      elements.stop.disabled = true;
      void this.actions.stop().finally(() => {
        elements.stop.disabled = false;
      });
    };
  }
  update(waiting: SessionWaiting | undefined) {
    this.waiting = waiting;
    if (waiting === undefined) {
      if (this.timer !== undefined) clearInterval(this.timer);
      this.timer = undefined;
    } else if (this.timer === undefined) this.timer = setInterval(() => this.render(), 30000);
    this.render();
  }
  dispose() {
    this.update(undefined);
    this.unsubscribe();
  }
  private render() {
    const { bar, text, jobs, stop } = this.elements,
      waiting = this.waiting;
    bar.hidden = waiting === undefined;
    if (waiting === undefined) {
      jobs.replaceChildren();
      return;
    }
    // Rebuilt on every state frame and every 30 s, so plain text (no locale bindings that would pile up).
    text.textContent = waitingSummary(waiting, (this.actions.now ?? Date.now)()).map(resolveLabel).join(" · ");
    jobs.replaceChildren(
      ...waiting.jobs.map((job) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `waiting-job ${job.status}`;
        chip.textContent = `${job.record.label} · ${resolveLabel(waitingStatus(job.status))}`;
        chip.title = resolveLabel(msg("Open {p0}", { p0: job.record.label }));
        chip.onclick = () => this.actions.open(job.record);
        return chip;
      }),
    );
    stop.textContent = resolveLabel(msg("Stop waiting"));
  }
}

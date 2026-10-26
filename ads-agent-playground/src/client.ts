import {
  createNuva,
  type NuvaClient,
  type Product,
  type ResourceLink,
} from "@nuva/sdk";
import { ChatController } from "./chat.js";
import { renderProduct } from "./product.js";
import {
  openResource,
  renderResources,
  refreshResourceList,
  type ResourceHost,
  type ResourceTab,
} from "./resources.js";
import {
  mergeResources,
  resourcesForSession,
  type KnownResource,
} from "./workspace.js";
import { action, button, byId, node, notice, report, showPane } from "./ui.js";
for (const view of ["workspace", "chat"] as const)
  byId(`mobile-${view}`).onclick = () => showPane(view);
showPane("workspace");
export function bootWorkspace(sdk: NuvaClient, scope: string) {
  let sessionId = "",
    records: KnownResource[] = [],
    selectedProduct: Product | undefined,
    tab: "product" | ResourceTab = "product",
    catalog: Product[] = [];
  try {
    const value = JSON.parse(
      localStorage.getItem(`${scope}:resources`) ?? "[]",
    );
    if (Array.isArray(value))
      records = value.filter(
        (r) =>
          r?.ref?.id &&
          r.ref.kind &&
          typeof r.label === "string" &&
          typeof r.sessionId === "string",
      );
  } catch {
    notice("The local resource list could not be restored.", true);
  }
  const content = byId("workspace-content");
  let renderEpoch = 0,
    destroyed = false;
  function remember(
    record: ResourceLink,
    extra?: { sourceScriptId?: string; order?: number },
    owner = sessionId,
  ) {
    const next = mergeResources(records, [
      { ref: record.ref, label: record.label, sessionId: owner, ...extra },
    ]);
    if (JSON.stringify(next) === JSON.stringify(records)) return;
    records = next;
    try {
      localStorage.setItem(`${scope}:resources`, JSON.stringify(records));
    } catch {
      notice(
        "The browser resource list could not be saved. Your saved work is still available.",
        true,
      );
    }
    if (owner !== sessionId || destroyed) return;
    drawTabs();
    refreshResourceList(content, host());
    if (record.ref.kind !== "product")
      byId("resource-update").replaceChildren(
        button(
          `View ${record.label} ↗`,
          () => void action(() => open(record)),
          "resource-button",
        ),
      );
  }
  function host(): ResourceHost {
    const owner = sessionId;
    return {
      sdk,
      scope,
      sessionId: owner,
      records: resourcesForSession(records, owner),
      ...(selectedProduct ? { product: selectedProduct } : {}),
      remember: (record, extra) => remember(record, extra, owner),
      attach: (record) => chat.attach(record),
      changed: () => {
        if (owner !== sessionId || destroyed) return;
        tab = "prompt";
        void action(render);
      },
      videoSubmissionEnabled: true,
    };
  }
  const chat = new ChatController({
    sdk,
    scope,
    selected: (id) => {
      sessionId = id;
      byId("resource-update").replaceChildren();
      void action(render);
    },
    resource: remember,
    open: (record) => void action(() => open(record)),
    resources: () => [
      ...catalog,
      ...resourcesForSession(records, sessionId),
      ...(selectedProduct ? [selectedProduct] : []),
    ],
  });
  function drawTabs() {
    const visible = resourcesForSession(records, sessionId);
    byId("tabs").replaceChildren(
      ...(
        [
          ["product", "Products"],
          ["script", "Scripts"],
          ["prompt", "Prompts"],
          ["job", "Clips"],
          ["asset", "Finals"],
        ] as const
      ).map(([kind, label]) => {
        const b = button(
          label,
          () => {
            tab = kind;
            void action(render);
          },
          tab === kind ? "active" : "",
        );
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(tab === kind));
        const count =
          kind === "product"
            ? catalog.length
            : visible.filter((r) =>
                kind === "asset"
                  ? ["asset", "ad"].includes(r.ref.kind)
                  : r.ref.kind === kind,
              ).length;
        if (count) b.append(node("span", String(count), "tab-count"));
        return b;
      }),
    );
  }
  async function open(record: ResourceLink) {
    showPane("workspace");
    if (record.ref.kind === "product") {
      selectedProduct = await sdk.products.get(record.ref.id);
      tab = "product";
      await render();
    } else {
      tab = (
        ["script", "prompt", "job"].includes(record.ref.kind)
          ? record.ref.kind
          : "asset"
      ) as ResourceTab;
      drawTabs();
      const panel = node("div");
      content.replaceChildren(panel);
      await openResource(panel, record, host());
    }
  }
  async function render() {
    const epoch = ++renderEpoch;
    drawTabs();
    const panel = node("div");
    content.replaceChildren(panel);
    if (tab === "product")
      await renderProduct(
        panel,
        sdk,
        selectedProduct?.id,
        (product) => {
          if (destroyed || epoch !== renderEpoch) return;
          selectedProduct = product;
          if (product) {
            catalog = [product, ...catalog.filter((p) => p.id !== product.id)];
            drawTabs();
          }
        },
        (record) => chat.attach(record),
      );
    else await renderResources(panel, tab, host());
  }
  byId("refresh-workspace").onclick = () => void action(render);
  const ready = Promise.all([
    chat.start(),
    sdk.products.list({ limit: 100 }).then((page) => {
      if (!destroyed) {
        catalog = page.items.slice();
        drawTabs();
      }
    }),
  ]);
  return {
    chat,
    ready,
    close() {
      destroyed = true;
      renderEpoch++;
      chat.destroy();
      sdk.close();
    },
  };
}
async function main() {
  const dialog = byId<HTMLDialogElement>("connection-dialog"),
    form = byId<HTMLFormElement>("connection-form");
  let workspace: ReturnType<typeof bootWorkspace> | undefined,
    connectionId: string | undefined;
  byId("connection-button").onclick = () => dialog.showModal();
  byId("welcome-connect").onclick = () => dialog.showModal();
  byId("close-connection").onclick = () => dialog.close();
  byId("notice").onclick = () => {
    byId("notice").hidden = true;
  };
  try {
    const stored = JSON.parse(
      localStorage.getItem("ads-playground:endpoints") ?? "null",
    );
    if (stored)
      for (const key of ["agent", "store", "generation"])
        if (typeof stored[key] === "string")
          byId<HTMLInputElement>(`${key}-url`).value = stored[key];
  } catch {}
  byId("disconnect").onclick = () => {
    workspace?.close();
    workspace = undefined;
    if (connectionId)
      void fetch(`/playground/connections/${connectionId}`, {
        method: "DELETE",
      });
    location.reload();
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    void action(async () => {
      const submit = byId<HTMLButtonElement>("connect-submit"),
        error = byId("connection-error"),
        tokenInput = byId<HTMLInputElement>("user-token");
      const token = tokenInput.value.trim(),
        settings = {
          agent: byId<HTMLInputElement>("agent-url").value.trim(),
          store: byId<HTMLInputElement>("store-url").value.trim(),
          generation: byId<HTMLInputElement>("generation-url").value.trim(),
        };
      if (!token) return;
      submit.disabled = true;
      submit.textContent = "Connecting…";
      error.hidden = true;
      let nextId: string | undefined;
      try {
        const response = await fetch("/playground/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (!response.ok)
          throw new Error("Check your service URLs and try again.");
        const connection: {
          id: string;
          agent: string;
          store: string;
          generation: string;
        } = await response.json();
        nextId = connection.id;
        const sdk = createNuva({
          baseUrl: connection.agent,
          storeBaseUrl: connection.store,
          generationBaseUrl: connection.generation,
          getAccessToken: async () => token,
        });
        try {
          await sdk.sessions.list({ limit: 1 });
        } catch (failure) {
          sdk.close();
          throw failure;
        }
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(settings) + token),
        );
        const scope = `ads-playground:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
        workspace?.close();
        if (connectionId)
          void fetch(`/playground/connections/${connectionId}`, {
            method: "DELETE",
          });
        connectionId = connection.id;
        localStorage.setItem(
          "ads-playground:endpoints",
          JSON.stringify(settings),
        );
        workspace = bootWorkspace(sdk, scope);
        await workspace.ready;
        tokenInput.value = "";
        byId("connection-label").textContent = "Connected";
        byId("connection-button").classList.add("connected");
        byId("disconnect").hidden = false;
        dialog.close();
      } catch (failure) {
        if (nextId && nextId !== connectionId)
          void fetch(`/playground/connections/${nextId}`, { method: "DELETE" });
        error.textContent = (failure as Error).message;
        error.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = "Open workspace ↗";
      }
    });
  };
  window.addEventListener(
    "pagehide",
    () => {
      workspace?.close();
      if (connectionId)
        void fetch(`/playground/connections/${connectionId}`, {
          method: "DELETE",
          keepalive: true,
        });
    },
    { once: true },
  );
}
if (!document.documentElement.hasAttribute("data-test-fixture"))
  void main().catch(report);

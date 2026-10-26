import { initializeLanguage, msg, setText, UiError } from "./i18n.js";
import { ResourceIndex } from "./resource-index.js";
import {
  createNuva,
  type NuvaClient,
  type Product,
  type ResourceLink,
  type AccessToken,
} from "@nuva/sdk";
import { icon } from "./icons.js";
import { ChatController } from "./chat.js";
import { renderProduct, refreshProductGallery } from "./product.js";
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
  resourcesForTab,
  type KnownResource,
} from "./workspace.js";
import {
  action,
  button,
  byId,
  node,
  notice,
  report,
  showPane,
  refreshActiveView,
} from "./ui.js";
initializeLanguage();
byId("language-icon").replaceChildren(icon("language"));
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
    notice(msg("The local resource list could not be restored."), true);
  }
  const resourceIndex = new ResourceIndex(scope, localStorage, () =>
    notice(msg("Resource numbers could not be saved in this browser."), true),
  );
  resourceIndex.seed(records);
  const content = byId("workspace-content");
  let navigationEpoch = 0;
  let renderEpoch = 0,
    destroyed = false;
  function remember(
    record: ResourceLink,
    extra?: {
      sourceScriptId?: string;
      order?: number;
      purpose?: "clip" | "final";
      finalAssetId?: string;
    },
    owner = sessionId,
  ) {
    resourceIndex.label(owner, record);
    const next = mergeResources(records, [
      { ref: record.ref, label: record.label, sessionId: owner, ...extra },
    ]);
    if (JSON.stringify(next) === JSON.stringify(records)) {
      if (owner === sessionId && !destroyed && record.ref.kind === "product")
        void action(() => refreshProductGallery(content, sdk, record.ref.id));
      else if (owner === sessionId && !destroyed && record.ref.kind === "job")
        refreshResourceList(content, host());
      return;
    }
    records = next;
    try {
      localStorage.setItem(`${scope}:resources`, JSON.stringify(records));
    } catch {
      notice(
        msg(
          "The browser resource list could not be saved. Your saved work is still available.",
        ),
        true,
      );
    }
    if (owner !== sessionId || destroyed) return;
    drawTabs();
    refreshResourceList(content, host());
    if (record.ref.kind === "product")
      void action(() => refreshProductGallery(content, sdk, record.ref.id));
  }
  function host(): ResourceHost {
    const owner = sessionId;
    return {
      sdk,
      scope,
      sessionId: owner,
      records: resourcesForSession(records, owner),
      indexLabel: (record) => resourceIndex.label(owner, record),
      products: catalog,
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
      navigationEpoch++;
      sessionId = id;
      void action(render);
    },
    resource: remember,
    indexLabel: (record) => resourceIndex.label(sessionId, record),
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
          msg(label),
          () => {
            navigationEpoch++;
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
            : resourcesForTab(visible, kind).length;
        if (count) b.append(node("span", String(count), "tab-count"));
        return b;
      }),
    );
  }
  async function open(record: ResourceLink) {
    const navigation = ++navigationEpoch;
    showPane("workspace");
    if (record.ref.kind === "product") {
      const product = await sdk.products.get(record.ref.id);
      if (navigation !== navigationEpoch || destroyed) return;
      selectedProduct = product;
      tab = "product";
      await render(true);
    } else {
      tab = (
        ["script", "prompt", "job"].includes(record.ref.kind)
          ? record.ref.kind
          : "asset"
      ) as ResourceTab;
      await render();
      if (navigation !== navigationEpoch || destroyed) return;
      await openResource(content, record, host());
    }
  }
  async function render(openProduct = false) {
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
        openProduct,
        (products) => {
          if (destroyed || epoch !== renderEpoch) return;
          catalog = products;
          if (selectedProduct)
            selectedProduct =
              products.find((p) => p.id === selectedProduct!.id) ??
              selectedProduct;
          drawTabs();
        },
      );
    else await renderResources(panel, tab, host());
  }
  const refresh = byId<HTMLButtonElement>("refresh-workspace");
  refresh.replaceChildren(icon("refresh"));
  refresh.onclick = () =>
    void action(async () => {
      const epoch = navigationEpoch;
      const workspace = content.closest<HTMLElement>(".workspace");
      const scroll = workspace?.scrollTop ?? 0;
      refresh.disabled = true;
      refresh.classList.add("refreshing");
      try {
        if (!(await refreshActiveView(content))) await render();
      } finally {
        if (epoch === navigationEpoch && workspace)
          workspace.scrollTop = scroll;
        refresh.disabled = false;
        refresh.classList.remove("refreshing");
      }
    });
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
    connectionId: string | undefined,
    connecting = false;
  byId("connection-button").onclick = () => dialog.showModal();
  byId("close-connection").onclick = () => dialog.close();
  byId("notice").onclick = () => {
    byId("notice").hidden = true;
  };
  async function connect() {
    if (connecting) return;
    connecting = true;
    const submit = byId<HTMLButtonElement>("connect-submit"),
      error = byId("connection-error");
    const settings = {
      agent: byId<HTMLInputElement>("agent-url").value.trim(),
      store: byId<HTMLInputElement>("store-url").value.trim(),
      generation: byId<HTMLInputElement>("generation-url").value.trim(),
    };
    submit.disabled = true;
    setText(submit, msg("Connecting…"));
    error.hidden = true;
    let nextId: string | undefined;
    try {
      const response = await fetch("/playground/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new UiError(
          typeof body.error === "string"
            ? body.error
            : msg("Could not connect. Check the service URLs and try again."),
        );
      }
      const connection: {
        id: string;
        scope: string;
        agent: string;
        store: string;
        generation: string;
      } = await response.json();
      if (!connection.id || !connection.scope)
        throw new UiError(
          msg("The playground returned an invalid connection."),
        );
      nextId = connection.id;
      let requested = false;
      const sdk = createNuva({
        baseUrl: connection.agent,
        storeBaseUrl: connection.store,
        generationBaseUrl: connection.generation,
        getAccessToken: async (): Promise<AccessToken> => {
          const path = requested
            ? "/playground/token?force=1"
            : "/playground/token";
          requested = true;
          const response = await fetch(path, { cache: "no-store" });
          if (!response.ok)
            throw new UiError(
              msg(
                "Could not refresh your access. Check the playground backend and try again.",
              ),
            );
          return response.json();
        },
      });
      try {
        await sdk.sessions.list({ limit: 1 });
      } catch (failure) {
        sdk.close();
        throw failure;
      }
      workspace?.close();
      if (connectionId)
        void fetch(`/playground/connections/${connectionId}`, {
          method: "DELETE",
        });
      connectionId = connection.id;
      workspace = bootWorkspace(sdk, `ads-playground:${connection.scope}`);
      await workspace.ready;
      setText(byId("connection-label"), msg("Connected"));
      byId("connection-button").classList.add("connected");
      dialog.close();
    } catch (failure) {
      if (nextId && nextId !== connectionId)
        void fetch(`/playground/connections/${nextId}`, { method: "DELETE" });
      setText(
        error,
        failure instanceof UiError
          ? failure.uiMessage
          : (failure as Error).message,
      );
      error.hidden = false;
      setText(byId("connection-label"), msg("Connection settings"));
      if (!dialog.open) dialog.showModal();
    } finally {
      connecting = false;
      submit.disabled = false;
      setText(submit, msg("Apply settings ↗"));
    }
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    void connect();
  };
  const response = await fetch("/playground/config", { cache: "no-store" });
  if (!response.ok)
    throw new UiError(
      msg(
        "The playground backend is unavailable. Start it with pnpm playground.",
      ),
    );
  const defaults: Record<string, string> = await response.json();
  for (const key of ["agent", "store", "generation"]) {
    if (typeof defaults[key] !== "string" || !defaults[key])
      throw new UiError(msg("The playground has incomplete service settings."));
    byId<HTMLInputElement>(`${key}-url`).value = defaults[key];
  }
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
  await connect();
}
if (!document.documentElement.hasAttribute("data-test-fixture"))
  void main().catch(report);

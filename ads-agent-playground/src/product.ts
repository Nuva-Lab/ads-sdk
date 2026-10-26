import { setText, msg, setAttribute, UiError } from "./i18n.js";
import { option } from "./ui.js";
import { icon } from "./icons.js";
import type { NuvaClient, Product, ResourceLink } from "@nuva/sdk";
import {
  productFields,
  productData,
  productFormChanged,
  type ProductFields,
} from "./workspace.js";
import {
  action,
  button,
  details,
  field,
  media,
  modal,
  node,
  notice,
  setViewRefresh,
} from "./ui.js";

const galleries = new WeakMap<HTMLElement, (product: Product) => void>();
export async function refreshProductGallery(
  container: HTMLElement,
  sdk: NuvaClient,
  id: string,
) {
  const gallery = container.querySelector<HTMLElement>(".product-gallery");
  if (!gallery) return;
  const product = await sdk.products.get(id);
  if (gallery.isConnected) galleries.get(gallery)?.(product);
}

export async function renderProduct(
  container: HTMLElement,
  sdk: NuvaClient,
  selected: string | undefined,
  pick: (product: Product | undefined) => void,
  attach: (record: ResourceLink) => void,
  openSelected = false,
  catalogChanged: (products: Product[]) => void = () => {},
) {
  container.replaceChildren(node("p", msg("Loading products…"), "muted"));
  const [page, brandPage] = await Promise.all([
    sdk.products.list({ limit: 100 }),
    sdk.brands.list({ limit: 100 }),
  ]);
  if (!container.isConnected) return;
  let products = page.items.slice(),
    brands = brandPage.items.slice();
  let productCursor = page.next_cursor,
    brandCursor = brandPage.next_cursor;
  let selectedId = selected;
  container.replaceChildren();
  const toolbar = node("div", "", "gallery-toolbar");
  toolbar.append(button(msg("New product"), () => edit(), "secondary", "plus"));
  const gallery = node("div", "", "resource-grid product-gallery");
  container.append(toolbar, gallery);
  const more = button(msg("More products"), () =>
    action(async () => {
      if (!productCursor) return;
      more.disabled = true;
      try {
        const next = await sdk.products.list({
          cursor: productCursor,
          limit: 100,
        });
        for (const product of next.items)
          products = [...products.filter((p) => p.id !== product.id), product];
        productCursor = next.next_cursor;
        drawGallery();
      } finally {
        more.disabled = false;
      }
    }),
  );
  container.append(more);
  function upsert(product: Product) {
    const index = products.findIndex((p) => p.id === product.id);
    if (index < 0) products = [product, ...products];
    else products = products.map((p) => (p.id === product.id ? product : p));
    drawGallery();
  }
  galleries.set(gallery, upsert);
  function drawGallery() {
    if (!gallery.isConnected) return;
    gallery.replaceChildren();
    for (const product of products) {
      const card = button(
        "",
        () => void action(() => show(product.id)),
        "gallery-card product-tile",
      );
      setAttribute(
        card,
        "aria-label",
        msg("View {p0}", { p0: product.data.name }),
      );
      card.dataset.resourceId = product.id;
      card.classList.toggle("selected", selectedId === product.id);
      const visual = node("div", "", "gallery-visual");
      const imageId = product.data.images?.[0];
      const asset = imageId ? product.assets[imageId] : undefined;
      if (asset) {
        const image = media(asset.download_url, "image");
        image.setAttribute("alt", product.data.name);
        visual.append(image);
      } else visual.append(node("span", msg("No image"), "media-placeholder"));
      const info = node("div", "", "gallery-info");
      info.append(node("h3", product.data.name));
      const brand = brands.find((b) => b.id === product.brand_id);
      if (brand) info.append(node("p", brand.data.name, "muted"));
      info.append(
        node("span", msg("Version {p0}", { p0: product.version }), "badge"),
      );
      card.append(visual, info);
      gallery.append(card);
    }
    if (!products.length)
      gallery.append(node("p", msg("No products yet."), "empty"));
    more.hidden = Boolean(review?.isConnected) || !productCursor;
    catalogChanged(products.slice());
  }
  let review: HTMLElement | undefined;
  async function show(id: string) {
    review?.remove();
    const currentReview = node("section", "", "product-review");
    review = currentReview;
    const heading = node("h2", msg("Product details"));
    const body = node("div", "", "review-body");
    const close = () => {
      currentReview.remove();
      gallery.hidden = false;
      toolbar.hidden = false;
      more.hidden = !productCursor;
    };
    const header = node("header", "", "resource-heading");
    const title = node("div", "", "resource-title");
    title.append(heading);
    const controls = node("div", "", "resource-actions");
    header.append(title, controls);
    currentReview.append(
      button(msg("Products"), close, "back-to-gallery", "back"),
      header,
      body,
    );
    setViewRefresh(currentReview, () => show(id));
    gallery.hidden = true;
    toolbar.hidden = true;
    more.hidden = true;
    container.append(currentReview);
    const popup = { body, heading, close };
    popup.body.append(node("p", msg("Loading…"), "muted"));
    try {
      const product = await sdk.products.get(id);
      if (!popup.body.isConnected) return;
      selectedId = product.id;
      pick(product);
      upsert(product);
      setText(popup.heading, product.data.name);
      popup.body.replaceChildren();
      const images = node("div", "", "product-review-images");
      for (const id of product.data.images ?? []) {
        const asset = product.assets[id];
        if (asset) images.append(media(asset.download_url, "image"));
        else images.append(node("p", msg("Image access unavailable"), "muted"));
      }
      if (images.childElementCount) popup.body.append(images);
      controls.append(
        button(msg("Attach to chat"), () => attach(product), "", "attach"),
        button(msg("Edit product"), () => edit(product), "", "edit"),
      );
      const brand = brands.find((b) => b.id === product.brand_id);
      if (brand) popup.body.append(node("p", brand.data.name, "muted"));
      if (product.data.target_audience)
        popup.body.append(
          node("h3", msg("Audience")),
          node("p", product.data.target_audience),
        );
      for (const [key, title] of [
        ["selling_points", "Selling points"],
        ["facts", "Facts"],
        ["constraints", "Constraints"],
      ] as const) {
        const values = product.data[key];
        if (!values?.length) continue;
        const list = node("ul");
        for (const text of values) list.append(node("li", text));
        popup.body.append(node("h3", title), list);
      }
      if (
        product.data.attributes &&
        Object.keys(product.data.attributes).length
      )
        popup.body.append(
          details(msg("Additional properties"), product.data.attributes),
        );
      popup.body.append(
        details(msg("Product details"), {
          id: product.id,
          version: product.version,
          revision: product.revision,
          brand_id: product.brand_id,
        }),
      );
    } catch (error) {
      popup.close();
      throw error;
    }
  }
  function edit(initial?: Product) {
    const popup = modal(
      container,
      initial
        ? msg("Edit {p0}", { p0: initial.data.name })
        : msg("New product"),
    );
    const editor = popup.body;
    let current = initial;
    function draw() {
      editor.replaceChildren();
      const base = current,
        original = productFields(base);
      const values = new Map<
        keyof ProductFields,
        HTMLInputElement | HTMLTextAreaElement
      >();
      const brand = node("select");
      brand.required = true;
      setAttribute(brand, "aria-label", msg("Brand"));
      const fillBrands = () => {
        brand.replaceChildren(option(msg("Select a Brand"), ""));
        for (const b of brands) brand.append(new Option(b.data.name, b.id));
      };
      fillBrands();
      brand.value = base?.brand_id ?? "";
      const brandRow = node("div", "", "row");
      brandRow.append(
        brand,
        button(msg("Create Brand"), () => {
          const creator = node("form", "", "row"),
            name = node("input");
          setAttribute(name, "placeholder", msg("Brand name"));
          name.required = true;
          const save = node("button", msg("Create"));
          save.type = "submit";
          creator.append(name, save);
          brandRow.after(creator);
          creator.onsubmit = (event) => {
            event.preventDefault();
            void action(async () => {
              save.disabled = true;
              try {
                const b = await sdk.brands.create({
                  data: { name: name.value.trim() },
                });
                brands.push(b);
                fillBrands();
                brand.value = b.id;
                creator.remove();
              } finally {
                save.disabled = false;
              }
            });
          };
        }),
      );
      editor.append(node("h4", msg("Brand")), brandRow);
      if (brandCursor) {
        const moreBrands = button(msg("More Brands"), () =>
          action(async () => {
            if (!brandCursor) return;
            moreBrands.disabled = true;
            try {
              const selected = brand.value,
                next = await sdk.brands.list({
                  cursor: brandCursor,
                  limit: 100,
                });
              brands.push(...next.items);
              brandCursor = next.next_cursor;
              fillBrands();
              brand.value = selected;
            } finally {
              moreBrands.disabled = !brandCursor;
            }
          }),
        );
        editor.append(moreBrands);
      }
      const form = node("form"),
        grid = node("div", "", "grid");
      const labels: Record<keyof ProductFields, string> = {
        name: "Product name",
        target_audience: "Audience",
        selling_points: "Selling points · one per line",
        facts: "Facts · one per line",
        constraints: "Constraints · one per line",
        attributes: "Additional details (JSON)",
      };
      for (const key of Object.keys(labels) as (keyof ProductFields)[]) {
        const f = field(
          msg(labels[key]),
          original[key],
          !["name", "target_audience"].includes(key),
        );
        values.set(key, f.input);
        if (key === "attributes") {
          f.wrapper.classList.add("wide");
          f.input.classList.add("json-input");
        }
        if (key === "attributes") {
          const advanced = node("details", "", "wide advanced-fields");
          advanced.append(
            node("summary", msg("Additional properties")),
            f.wrapper,
          );
          grid.append(advanced);
        } else grid.append(f.wrapper);
      }
      form.append(grid);
      const controls = node("div", "", "row"),
        save = node(
          "button",
          base ? msg("Save changes") : msg("Create Product"),
          "primary",
        );
      save.type = "submit";
      save.classList.add("button-with-icon");
      save.prepend(icon("check"));
      controls.classList.add("form-actions");
      controls.append(save);
      form.append(controls);
      editor.append(form);
      const getValues = () =>
        Object.fromEntries(
          [...values].map(([key, input]) => [key, input.value]),
        ) as unknown as ProductFields;
      form.onsubmit = (event) => {
        event.preventDefault();
        void action(async () => {
          if (!brand.value)
            throw new UiError(msg("Select or create a Brand first."));
          save.disabled = true;
          try {
            const data = productData(base, getValues());
            current = base
              ? await sdk.products.update({ base, data, brand_id: brand.value })
              : await sdk.products.create({ data, brand_id: brand.value });
            pick(current);
            upsert(current);
            popup.close();
            await show(current.id);
            notice(msg("Product saved."));
          } finally {
            save.disabled = false;
          }
        });
      };
      if (!base) return;
      const gallery = node("div", "", "gallery");
      for (const id of base.data.images ?? []) {
        const asset = base.assets[id],
          tile = node("div");
        if (asset) tile.append(media(asset.download_url, "image"));
        else tile.append(node("p", msg("Image access unavailable")));
        tile.append(node("p", id, "resource-id"));
        gallery.append(tile);
      }
      editor.append(node("h4", msg("Product images")), gallery);
      const upload = node("input");
      upload.type = "file";
      upload.accept = "image/png,image/jpeg,image/webp";
      setAttribute(upload, "aria-label", msg("Upload Product image"));
      upload.hidden = true;
      editor.append(
        button(msg("Add image"), () => upload.click(), "", "plus"),
        upload,
        node("p", msg("Save changes before adding images."), "muted"),
      );
      upload.onchange = () =>
        void action(async () => {
          if (
            productFormChanged(
              original,
              getValues(),
              base.brand_id,
              brand.value,
            )
          )
            throw new UiError(
              msg("Save your form changes before uploading an image."),
            );
          const file = upload.files?.[0];
          if (!file) return;
          upload.disabled = true;
          save.disabled = true;
          try {
            const result = await sdk.products.uploadImage({ base, file });
            current = result.product;
            pick(current);
            upsert(current);
            draw();
            notice(msg("Image uploaded and attached."));
          } finally {
            upload.disabled = false;
            save.disabled = false;
          }
        });
      const extra = details(msg("Product details"), {
        id: base.id,
        version: base.version,
      });
      editor.append(extra);
    }
    draw();
  }
  drawGallery();
  if (openSelected && selected) await show(selected);
}

import type { NuvaClient, Product, Brand, ResourceLink } from "@nuva/sdk";
import {
  productFields,
  productData,
  productFormChanged,
  type ProductFields,
} from "./workspace.js";
import { action, button, details, field, media, node, notice } from "./ui.js";
export async function renderProduct(
  container: HTMLElement,
  sdk: NuvaClient,
  selected: string | undefined,
  pick: (product: Product | undefined) => void,
  attach: (record: ResourceLink) => void,
) {
  container.replaceChildren(node("p", "Loading Product catalogue…", "muted"));
  const [page, brandPage] = await Promise.all([
    sdk.products.list({ limit: 100 }),
    sdk.brands.list({ limit: 100 }),
  ]);
  if (!container.isConnected) return;
  let products = [...page.items],
    brands = [...brandPage.items],
    productCursor = page.next_cursor,
    brandCursor = brandPage.next_cursor,
    selectionEpoch = 0;
  container.replaceChildren();
  const chooser = node("select");
  chooser.setAttribute("aria-label", "Product");
  chooser.append(new Option("New Product", ""));
  const fillProducts = () => {
    for (const p of products)
      if (![...chooser.options].some((o) => o.value === p.id))
        chooser.append(new Option(p.data.name, p.id));
  };
  fillProducts();
  chooser.value = selected ?? "";
  const row = node("div", "", "row");
  row.append(chooser);
  const more = button("More Products", () =>
    action(async () => {
      if (!productCursor) return;
      more.disabled = true;
      try {
        const next = await sdk.products.list({
          cursor: productCursor,
          limit: 100,
        });
        products.push(...next.items);
        productCursor = next.next_cursor;
        fillProducts();
      } finally {
        more.disabled = !productCursor;
      }
    }),
  );
  if (productCursor) row.append(more);
  container.append(row);
  const editor = node("section", "", "card");
  container.append(editor);
  let current: Product | undefined;
  async function show(id: string) {
    const epoch = ++selectionEpoch;
    const loaded = id ? await sdk.products.get(id) : undefined;
    if (epoch !== selectionEpoch || !editor.isConnected) return;
    current = loaded;
    pick(current);
    draw();
  }
  function draw() {
    editor.replaceChildren();
    const base = current,
      original = productFields(base),
      values = new Map<
        keyof ProductFields,
        HTMLInputElement | HTMLTextAreaElement
      >();
    const heading = node("div", "", "section-heading");
    const headingText = node("div");
    headingText.append(node("h2", base ? base.data.name : "New Product"));
    if (base)
      headingText.append(node("span", `Version ${base.version}`, "badge"));
    heading.append(headingText);
    const coverId = base?.data.images?.[0];
    const cover = coverId ? base?.assets[coverId] : undefined;
    if (cover) {
      const image = media(cover.download_url, "image");
      image.classList.add("product-cover");
      heading.append(image);
    }
    editor.append(heading);
    const brand = node("select");
    brand.required = true;
    brand.setAttribute("aria-label", "Brand");
    const fillBrands = () => {
      brand.replaceChildren(new Option("Select a Brand", ""));
      for (const b of brands) brand.append(new Option(b.data.name, b.id));
    };
    fillBrands();
    brand.value = base?.brand_id ?? "";
    const brandRow = node("div", "", "row");
    brandRow.append(
      brand,
      button("Create Brand", () => {
        const creator = node("form", "", "row"),
          name = node("input");
        name.placeholder = "Brand name";
        name.required = true;
        const save = node("button", "Create");
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
    editor.append(node("h4", "Brand"), brandRow);
    if (brandCursor) {
      const moreBrands = button("More Brands", () =>
        action(async () => {
          if (!brandCursor) return;
          moreBrands.disabled = true;
          try {
            const selected = brand.value,
              next = await sdk.brands.list({ cursor: brandCursor, limit: 100 });
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
        labels[key],
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
        advanced.append(node("summary", "Additional properties"), f.wrapper);
        grid.append(advanced);
      } else grid.append(f.wrapper);
    }
    form.append(grid);
    const controls = node("div", "", "row"),
      save = node(
        "button",
        base ? "Save changes" : "Create Product",
        "primary",
      );
    save.type = "submit";
    controls.append(save);
    if (base)
      controls.append(
        button("Reload saved version", () => action(() => show(base.id))),
        button("Attach to chat", () => attach(base)),
      );
    form.append(controls);
    editor.append(form);
    const getValues = () =>
      Object.fromEntries(
        [...values].map(([key, input]) => [key, input.value]),
      ) as unknown as ProductFields;
    form.onsubmit = (event) => {
      event.preventDefault();
      void action(async () => {
        if (!brand.value) throw new Error("Select or create a Brand first.");
        save.disabled = true;
        try {
          const data = productData(base, getValues());
          current = base
            ? await sdk.products.update({ base, data, brand_id: brand.value })
            : await sdk.products.create({ data, brand_id: brand.value });
          pick(current);
          products.push(current);
          fillProducts();
          chooser.value = current.id;
          draw();
          notice("Product saved.");
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
      else tile.append(node("p", "Image access unavailable"));
      tile.append(node("p", id, "resource-id"));
      gallery.append(tile);
    }
    editor.append(node("h4", "Product images"), gallery);
    const upload = node("input");
    upload.type = "file";
    upload.accept = "image/png,image/jpeg,image/webp";
    upload.setAttribute("aria-label", "Upload Product image");
    upload.hidden = true;
    editor.append(
      button("Add image", () => upload.click()),
      upload,
      node("p", "Save changes before adding images.", "muted"),
    );
    upload.onchange = () =>
      void action(async () => {
        if (
          productFormChanged(original, getValues(), base.brand_id, brand.value)
        )
          throw new Error("Save your form changes before uploading an image.");
        const file = upload.files?.[0];
        if (!file) return;
        upload.disabled = true;
        save.disabled = true;
        try {
          const result = await sdk.products.uploadImage({ base, file });
          current = result.product;
          pick(current);
          draw();
          notice("Image uploaded and attached.");
        } finally {
          upload.disabled = false;
          save.disabled = false;
        }
      });
    const extra = details("Product details", {
      id: base.id,
      version: base.version,
    });
    editor.append(extra);
  }
  chooser.onchange = () => void action(() => show(chooser.value));
  await show(chooser.value);
}

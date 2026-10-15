function finiteNumber(value, label, { min = -Infinity, exclusiveMin = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || (exclusiveMin ? number <= min : number < min)) {
    throw new Error(`${label} inválido.`);
  }
  return number;
}

function normalizeProduct(product) {
  if (!product || typeof product.name !== "string" || !product.name.trim()) {
    throw new Error("A nota contém um item sem nome.");
  }

  const itemQuantity = finiteNumber(product.quantity, "Quantidade", { min: 0, exclusiveMin: true });
  const unitPrice = finiteNumber(product.unit_price, "Preço unitário", { min: 0 });
  const totalPrice =
    product.total_price == null
      ? Math.round(itemQuantity * unitPrice * 100) / 100
      : finiteNumber(product.total_price, "Total do item", { min: 0 });

  return {
    name: product.name.trim(),
    code: product.code == null ? "" : String(product.code),
    quantity: itemQuantity,
    unit: product.unit == null ? "" : String(product.unit),
    unit_price: unitPrice,
    total_price: totalPrice,
  };
}

function cloneInvoice(invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    series: invoice.series,
    access_key: invoice.access_key,
    issued_at: invoice.issued_at,
    total_items: invoice.total_items,
    total_amount: invoice.total_amount,
    issuer: { ...invoice.issuer },
    payments: invoice.payments.map((payment) => ({ ...payment })),
    products: invoice.products.map((product) => ({ ...product })),
  };
}

export function sortItems(items, column, direction = "asc") {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftValue = left[column];
    const rightValue = right[column];
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * multiplier;
    }
    return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }) * multiplier;
  });
}

export class InvoiceBook {
  #invoices = [];
  #items = [];
  #nextInvoiceId = 1;
  #nextItemId = 1;

  listInvoices() {
    return this.#invoices.map(cloneInvoice);
  }

  listItems() {
    return this.#items.map((item) => ({ ...item }));
  }

  addInvoice(data) {
    if (!data || !Array.isArray(data.products)) {
      throw new Error("A resposta da nota não contém uma lista válida de itens.");
    }
    if (!Array.isArray(data.payments ?? [])) {
      throw new Error("A resposta da nota contém pagamentos inválidos.");
    }

    const id = `invoice-${this.#nextInvoiceId}`;
    const invoice = {
      id,
      number: data.number ?? "-",
      series: data.series ?? "-",
      access_key: data.access_key ?? "",
      issued_at: data.issued_at ?? null,
      total_items: data.total_items ?? data.products.length,
      total_amount: data.total_amount == null ? null : finiteNumber(data.total_amount, "Total da nota"),
      issuer: {
        name: data.issuer?.name ?? "-",
        cnpj: data.issuer?.cnpj ?? "-",
        address: data.issuer?.address ?? "-",
      },
      payments: (data.payments ?? []).map((payment) => ({ ...payment })),
      products: data.products.map((product) => ({
        ...normalizeProduct(product),
        id: `item-${this.#nextItemId++}`,
      })),
    };

    const items = invoice.products.map((product) => ({
      ...product,
      invoiceId: id,
      source: this.#invoiceLabel(invoice),
    }));
    this.#nextInvoiceId += 1;
    this.#invoices.push(invoice);
    this.#items.push(...items);
    return cloneInvoice(invoice);
  }

  addManualItem({ name, quantity, unit, unit_price }) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Informe o nome do item.");
    }
    if (typeof unit !== "string" || !unit.trim()) {
      throw new Error("Informe a unidade do item.");
    }

    const normalizedQuantity = finiteNumber(quantity, "Quantidade", { min: 0, exclusiveMin: true });
    const unitPrice = finiteNumber(unit_price, "Preço unitário", { min: 0 });
    const item = {
      ...normalizeProduct(
        {
          name,
          quantity: normalizedQuantity,
          unit,
          unit_price: unitPrice,
          total_price: Math.round(normalizedQuantity * unitPrice * 100) / 100,
        }
      ),
      id: `item-${this.#nextItemId++}`,
      invoiceId: null,
      source: "Manual",
    };
    this.#items.push(item);
    return { ...item };
  }

  removeItem(id) {
    const index = this.#items.findIndex((product) => product.id === id);
    if (index < 0) throw new Error("Item não encontrado.");

    return { ...this.#items.splice(index, 1)[0] };
  }

  updateItem(id, changes) {
    const item = this.#items.find((product) => product.id === id);
    if (!item) throw new Error("Item não encontrado.");
    if (typeof changes.name !== "string" || !changes.name.trim()) {
      throw new Error("Informe o nome do item.");
    }

    const normalized = normalizeProduct({
      name: changes.name,
      code: changes.code ?? "",
      quantity: changes.quantity,
      unit: changes.unit,
      unit_price: changes.unit_price,
      total_price:
        Math.round(Number(changes.quantity) * Number(changes.unit_price) * 100) / 100,
    });
    Object.assign(item, normalized);
    return { ...item };
  }

  #invoiceLabel(invoice) {
    const identity = invoice.number === "-" ? "Nota fiscal" : `Nota ${invoice.number}`;
    const series = invoice.series === "-" ? "" : ` / Série ${invoice.series}`;
    return `${identity}${series}`;
  }
}

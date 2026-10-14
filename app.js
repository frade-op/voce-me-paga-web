import { InvoiceBook } from "./invoices.mjs";
import { ParticipantRoster } from "./participants.mjs";

const participantForm = document.getElementById("participant-form");
const participantNameInput = document.getElementById("participant-name");
const participantStatusEl = document.getElementById("participant-status");
const participantsEmptyEl = document.getElementById("participants-empty");
const participantsListEl = document.getElementById("participants-list");
const form = document.getElementById("invoice-form");
const urlInput = document.getElementById("invoice-url");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const invoicesListEl = document.getElementById("invoices-list");
const invoicesEmptyEl = document.getElementById("invoices-empty");
const combinedItemsEl = document.getElementById("combined-items");
const combinedTotalsEl = document.getElementById("combined-totals");
const manualItemForm = document.getElementById("manual-item-form");
const itemsStatusEl = document.getElementById("items-status");

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const participants = new ParticipantRoster();
const invoiceBook = new InvoiceBook();
let editingParticipantId = null;

const money = (value) => (value == null ? "-" : currency.format(Number(value)));

function setParticipantStatus(message, isError = false) {
  participantStatusEl.textContent = message;
  participantStatusEl.classList.toggle("error", isError);
}

function createParticipantButton(label, action, participant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button";
  button.dataset.action = action;
  button.dataset.participantId = participant.id;
  button.textContent = label;
  button.setAttribute("aria-label", `${label} ${participant.name}`);
  return button;
}

function renderParticipants(focusEditingInput = false) {
  const rows = participants.list().map((participant) => {
    const item = document.createElement("li");
    item.className = "participant-row";

    if (participant.id === editingParticipantId) {
      const editForm = document.createElement("form");
      editForm.className = "participant-edit-form";
      editForm.dataset.participantId = participant.id;

      const label = document.createElement("label");
      label.className = "visually-hidden";
      label.htmlFor = `edit-${participant.id}`;
      label.textContent = `Editar nome de ${participant.name}`;

      const input = document.createElement("input");
      input.id = `edit-${participant.id}`;
      input.name = "name";
      input.type = "text";
      input.maxLength = 80;
      input.value = participant.name;
      input.required = true;

      const actions = document.createElement("div");
      actions.className = "participant-actions";
      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Salvar";
      const cancelButton = createParticipantButton("Cancelar", "cancel", participant);
      actions.append(saveButton, cancelButton);
      editForm.append(label, input, actions);
      item.append(editForm);
      if (focusEditingInput) input.focus();
      return item;
    }

    const name = document.createElement("span");
    name.className = "participant-name";
    name.textContent = participant.name;
    const actions = document.createElement("div");
    actions.className = "participant-actions";
    actions.append(
      createParticipantButton("Editar", "edit", participant),
      createParticipantButton("Remover", "remove", participant)
    );
    item.append(name, actions);
    return item;
  });

  participantsListEl.replaceChildren(...rows);
  participantsEmptyEl.hidden = rows.length > 0;
}

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const participant = participants.add(participantNameInput.value);
    participantForm.reset();
    setParticipantStatus(`${participant.name} adicionado.`);
    renderParticipants();
    participantNameInput.focus();
  } catch (error) {
    setParticipantStatus(error.message, true);
    participantNameInput.focus();
  }
});

participantsListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !participantsListEl.contains(button)) return;

  const { action, participantId } = button.dataset;
  if (action === "edit") {
    editingParticipantId = participantId;
    setParticipantStatus("");
    renderParticipants(true);
    return;
  }
  if (action === "cancel") {
    editingParticipantId = null;
    setParticipantStatus("");
    renderParticipants();
    return;
  }
  if (action === "remove") {
    try {
      const participant = participants.remove(participantId);
      editingParticipantId = null;
      setParticipantStatus(`${participant.name} removido.`);
      renderParticipants();
    } catch (error) {
      setParticipantStatus(error.message, true);
    }
  }
});

participantsListEl.addEventListener("submit", (event) => {
  const editForm = event.target.closest(".participant-edit-form");
  if (!editForm || !participantsListEl.contains(editForm)) return;

  event.preventDefault();
  const input = editForm.elements.namedItem("name");
  try {
    const participant = participants.rename(editForm.dataset.participantId, input.value);
    editingParticipantId = null;
    setParticipantStatus(`${participant.name} atualizado.`);
    renderParticipants();
  } catch (error) {
    setParticipantStatus(error.message, true);
    input.focus();
  }
});

function setStatus(message, isError = false) {
  statusEl.hidden = !message;
  statusEl.textContent = message ?? "";
  statusEl.classList.toggle("error", isError);
}

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text ?? "-";
  if (className) td.className = className;
  return td;
}

function renderInfo(invoice, container) {
  const { issuer } = invoice;
  const issuedAt = invoice.issued_at ? new Date(invoice.issued_at).toLocaleString("pt-BR") : "-";
  const lines = [
    ["Emissor", issuer?.name],
    ["CNPJ", issuer?.cnpj],
    ["Endereço", issuer?.address],
    ["Emissão", issuedAt],
    ["Nota / Série", `${invoice.number ?? "-"} / ${invoice.series ?? "-"}`],
    ["Chave de acesso", invoice.access_key],
  ];
  container.replaceChildren(
    ...lines.map(([label, value]) => {
      const p = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      p.append(strong, value ?? "-");
      return p;
    })
  );
}

function renderItemTable(
  body,
  totals,
  items,
  {
    includeSource = false,
    allowRemoval = true,
    totalAmount,
    totalItems = items.length,
  } = {}
) {
  const rows = items.map((item) => {
    const row = document.createElement("tr");
    row.append(
      cell(item.name),
      cell(item.code || "-"),
      cell(quantity.format(item.quantity), "num"),
      cell(item.unit || "-"),
      cell(money(item.unit_price), "num"),
      cell(money(item.total_price), "num")
    );
    if (includeSource) row.append(cell(item.source));
    if (allowRemoval) {
      const action = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "secondary-button remove-item-button";
      removeButton.dataset.itemId = item.id;
      removeButton.textContent = "Remover";
      removeButton.setAttribute("aria-label", `Remover ${item.name}`);
      action.append(removeButton);
      row.append(action);
    }
    return row;
  });

  if (!items.length) {
    const row = document.createElement("tr");
    const message = cell("Nenhum item nesta lista.");
    message.colSpan = 6 + Number(includeSource) + Number(allowRemoval);
    row.append(message);
    rows.push(row);
  }
  body.replaceChildren(...rows);

  const total = totalAmount ?? items.reduce((sum, item) => sum + Number(item.total_price), 0);
  const totalRow = document.createElement("tr");
  const label = cell(`Total (${totalItems} ${totalItems === 1 ? "item" : "itens"})`);
  label.colSpan = 5;
  totalRow.append(label, cell(money(total), "num"));
  if (includeSource) totalRow.append(cell(""));
  if (allowRemoval) totalRow.append(cell(""));
  totals.replaceChildren(totalRow);
}

function renderPayments(invoice, container) {
  if (!invoice.payments.length) {
    container.replaceChildren();
    return;
  }
  const title = document.createElement("h3");
  title.textContent = "Pagamentos";
  const list = document.createElement("ul");
  list.replaceChildren(
    ...invoice.payments.map((p) => {
      const li = document.createElement("li");
      li.textContent = `${p.method}: ${money(p.amount)}`;
      return li;
    })
  );
  container.replaceChildren(title, list);
}

function renderInvoiceBook() {
  const previouslyOpen = new Set(
    [...invoicesListEl.querySelectorAll("details[open]")].map((details) => details.dataset.invoiceId)
  );
  const invoices = invoiceBook.listInvoices();
  const invoiceCards = invoices.map((invoice) => {
    const details = document.createElement("details");
    details.className = "invoice-accordion";
    details.dataset.invoiceId = invoice.id;
    details.open = previouslyOpen.has(invoice.id);

    const summary = document.createElement("summary");
    const itemTotal =
      invoice.total_amount ??
      invoice.products.reduce((sum, item) => sum + item.total_price, 0);
    const itemCount = invoice.total_items ?? invoice.products.length;
    const itemLabel = itemCount === 1 ? "item" : "itens";
    summary.textContent = `Nota ${invoice.number} / Série ${invoice.series} · ${
      invoice.issuer.name
    } · ${itemCount} ${itemLabel} · ${money(invoice.total_amount ?? itemTotal)}`;

    const content = document.createElement("div");
    content.className = "invoice-content";
    const info = document.createElement("div");
    info.className = "info";
    renderInfo(invoice, info);

    const table = document.createElement("div");
    table.className = "table-wrapper";
    const tableElement = document.createElement("table");
    tableElement.append(createTableHead(false, false));
    const body = document.createElement("tbody");
    const totals = document.createElement("tfoot");
    tableElement.append(body, totals);
    table.append(tableElement);
    renderItemTable(body, totals, invoice.products, {
      allowRemoval: false,
      totalAmount: invoice.total_amount,
      totalItems: invoice.total_items,
    });

    const payments = document.createElement("div");
    payments.className = "invoice-payments";
    renderPayments(invoice, payments);
    content.append(info, table, payments);

    details.append(summary, content);
    return details;
  });

  invoicesListEl.replaceChildren(...invoiceCards);
  invoicesEmptyEl.hidden = invoices.length > 0;
  renderItemTable(combinedItemsEl, combinedTotalsEl, invoiceBook.listItems(), {
    includeSource: true,
  });
}

function createTableHead(includeSource, allowRemoval = true) {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  const columns = ["Item", "Código", "Qtd", "Un", "Preço un.", "Total"];
  if (includeSource) columns.push("Origem");
  if (allowRemoval) columns.push("Ação");
  for (const column of columns) {
    const header = document.createElement("th");
    header.textContent = column;
    if (["Qtd", "Preço un.", "Total"].includes(column)) header.className = "num";
    row.append(header);
  }
  head.append(row);
  return head;
}

function errorMessage(status, body) {
  if (typeof body?.detail === "string") return body.detail;
  if (status === 422) return "URL inválida ou nota não reconhecida.";
  if (status === 502) return "O portal da nota fiscal não respondeu. Tente novamente.";
  return `Erro inesperado (${status}).`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Consultando nota fiscal...");

  try {
    const response = await fetch(`${window.API_BASE_URL}/invoices/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput.value.trim() }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus(errorMessage(response.status, body), true);
      return;
    }
    const invoice = invoiceBook.addInvoice(body);
    renderInvoiceBook();
    form.reset();
    const itemLabel = invoice.products.length === 1 ? "item" : "itens";
    setStatus(`Nota ${invoice.number} adicionada com ${invoice.products.length} ${itemLabel}.`);
  } catch (error) {
    setStatus(
      error instanceof TypeError ? "Não foi possível conectar ao serviço." : error.message,
      true
    );
  } finally {
    submitBtn.disabled = false;
  }
});

manualItemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(manualItemForm);
  try {
    const item = invoiceBook.addManualItem({
      name: formData.get("name"),
      quantity: formData.get("quantity"),
      unit: formData.get("unit"),
      unit_price: formData.get("unit-price"),
    });
    manualItemForm.reset();
    renderInvoiceBook();
    itemsStatusEl.textContent = `${item.name} adicionado à compra.`;
    itemsStatusEl.classList.remove("error");
    manualItemForm.elements.namedItem("name").focus();
  } catch (error) {
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
});

function removeItem(event) {
  const button = event.target.closest("button[data-item-id]");
  if (!button) return;
  try {
    const item = invoiceBook.removeItem(button.dataset.itemId);
    renderInvoiceBook();
    itemsStatusEl.textContent = `${item.name} removido da compra.`;
    itemsStatusEl.classList.remove("error");
  } catch (error) {
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
}

invoicesListEl.addEventListener("click", removeItem);
combinedItemsEl.addEventListener("click", removeItem);
renderInvoiceBook();

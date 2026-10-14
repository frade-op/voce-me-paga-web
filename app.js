import { InvoiceBook, sortItems } from "./invoices.mjs";
import { ParticipantRoster } from "./participants.mjs";

const participantForm = document.getElementById("participant-form");
const participantFirstNameInput = document.getElementById("participant-first-name");
const participantLastNameInput = document.getElementById("participant-last-name");
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
const itemEditDialog = document.getElementById("item-edit-dialog");
const itemEditForm = document.getElementById("item-edit-form");
const columnToggles = [...document.querySelectorAll(".column-visibility input[data-column]")];
const sortStates = new Map();

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

function sortTable(event) {
  const button = event.target.closest("button[data-sort-column]");
  if (!button) return;
  const table = button.closest("table[data-sort-id]");
  if (!table) return;

  const sortId = table.dataset.sortId;
  const current = sortStates.get(sortId);
  const direction =
    current?.column === button.dataset.sortColumn && current.direction === "asc" ? "desc" : "asc";
  sortStates.set(sortId, { column: button.dataset.sortColumn, direction });
  renderInvoiceBook();
}

function createParticipantButton(label, action, participant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    action === "edit"
      ? "icon-button edit-icon"
      : action === "remove"
        ? "icon-button delete-icon"
        : "secondary-button";
  button.dataset.action = action;
  button.dataset.participantId = participant.id;
  button.title = `${label} ${participant.name}`;
  button.setAttribute("aria-label", `${label} ${participant.name}`);
  if (action === "edit") {
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
  } else if (action === "remove") {
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
  } else {
    button.textContent = label;
  }
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
      label.htmlFor = `edit-first-name-${participant.id}`;
      label.textContent = `Editar nome de ${participant.name}`;

      const firstNameInput = document.createElement("input");
      firstNameInput.id = `edit-first-name-${participant.id}`;
      firstNameInput.name = "firstName";
      firstNameInput.type = "text";
      firstNameInput.maxLength = 50;
      firstNameInput.placeholder = "Nome";
      firstNameInput.autocomplete = "given-name";
      firstNameInput.value = participant.firstName;
      firstNameInput.required = true;

      const lastNameInput = document.createElement("input");
      lastNameInput.id = `edit-last-name-${participant.id}`;
      lastNameInput.name = "lastName";
      lastNameInput.type = "text";
      lastNameInput.maxLength = 50;
      lastNameInput.placeholder = "Sobrenome";
      lastNameInput.autocomplete = "family-name";
      lastNameInput.value = participant.lastName;
      lastNameInput.required = true;

      const actions = document.createElement("div");
      actions.className = "participant-actions";
      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Salvar";
      const cancelButton = createParticipantButton("Cancelar", "cancel", participant);
      actions.append(saveButton, cancelButton);
      const lastNameLabel = document.createElement("label");
      lastNameLabel.className = "visually-hidden";
      lastNameLabel.htmlFor = lastNameInput.id;
      lastNameLabel.textContent = `Editar sobrenome de ${participant.name}`;
      editForm.append(label, firstNameInput, lastNameLabel, lastNameInput, actions);
      item.append(editForm);
      if (focusEditingInput) firstNameInput.focus();
      return item;
    }

    const identity = document.createElement("span");
    identity.className = "participant-identity";
    const avatar = document.createElement("span");
    avatar.className = "participant-avatar";
    avatar.textContent = participant.initials;
    avatar.style.backgroundColor = participant.color;
    avatar.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "participant-name";
    name.textContent = participant.name;
    identity.append(avatar, name);
    const actions = document.createElement("div");
    actions.className = "participant-actions";
    actions.append(
      createParticipantButton("Editar", "edit", participant),
      createParticipantButton("Remover", "remove", participant)
    );
    item.append(identity, actions);
    return item;
  });

  participantsListEl.replaceChildren(...rows);
  participantsEmptyEl.hidden = rows.length > 0;
}

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const participant = participants.add(
      participantFirstNameInput.value,
      participantLastNameInput.value
    );
    participantForm.reset();
    setParticipantStatus(`${participant.name} adicionado.`);
    renderParticipants();
    participantFirstNameInput.focus();
  } catch (error) {
    setParticipantStatus(error.message, true);
    participantFirstNameInput.focus();
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
  const firstNameInput = editForm.elements.namedItem("firstName");
  const lastNameInput = editForm.elements.namedItem("lastName");
  try {
    const participant = participants.rename(
      editForm.dataset.participantId,
      firstNameInput.value,
      lastNameInput.value
    );
    editingParticipantId = null;
    setParticipantStatus(`${participant.name} atualizado.`);
    renderParticipants();
  } catch (error) {
    setParticipantStatus(error.message, true);
    firstNameInput.focus();
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
    visibleColumns = getVisibleColumns(),
  } = {}
) {
  const sortId = body.closest("table")?.dataset.sortId ?? "combined";
  const sortState = sortStates.get(sortId) ?? { column: "name", direction: "asc" };
  const sortedItems = sortItems(items, sortState.column, sortState.direction);
  const rows = sortedItems.map((item) => {
    const row = document.createElement("tr");
    const columns = [
      ["name", item.name, ""],
      ["code", item.code || "-", ""],
      ["quantity", quantity.format(item.quantity), "num"],
      ["unit", item.unit || "-", ""],
      ["unit_price", money(item.unit_price), "num"],
      ["total_price", money(item.total_price), "num"],
    ];
    if (includeSource) columns.push(["source", item.source, ""]);
    for (const [column, value, className] of columns) {
      const tableCell = cell(value, className);
      tableCell.dataset.column = column;
      tableCell.hidden = !includeSource && !visibleColumns.includes(column);
      row.append(tableCell);
    }
    if (allowRemoval) {
      const action = document.createElement("td");
      action.className = "actions-column";
      const actions = document.createElement("div");
      actions.className = "action-buttons";
      actions.append(createItemActionButton("edit", item), createItemActionButton("remove", item));
      action.append(actions);
      row.append(action);
    }
    return row;
  });

  if (!items.length) {
    const row = document.createElement("tr");
    const message = cell("Nenhum item nesta lista.");
    message.colSpan =
      (includeSource ? 6 : visibleColumns.length) + Number(includeSource) + Number(allowRemoval);
    row.append(message);
    rows.push(row);
  }
  body.replaceChildren(...rows);

  const total = totalAmount ?? items.reduce((sum, item) => sum + Number(item.total_price), 0);
  const totalRow = document.createElement("tr");
  const activeColumns = includeSource
    ? ["name", "code", "quantity", "unit", "unit_price", "total_price", "source"]
    : visibleColumns;
  for (const column of activeColumns) {
    const tableCell = cell("");
    tableCell.dataset.column = column;
    tableCell.hidden = !includeSource && !visibleColumns.includes(column);
    if (column === "name") {
      tableCell.textContent = `Total (${totalItems} ${totalItems === 1 ? "item" : "itens"})`;
    } else if (column === "total_price") {
      tableCell.textContent = money(total);
      tableCell.className = "num";
    }
    totalRow.append(tableCell);
  }
  if (allowRemoval) {
    const actionCell = cell("");
    actionCell.className = "actions-column";
    totalRow.append(actionCell);
  }
  totals.replaceChildren(totalRow);
}

function createItemActionButton(action, item) {
  const button = document.createElement("button");
  const isEdit = action === "edit";
  const label = isEdit ? "Editar" : "Remover";
  button.type = "button";
  button.className = `icon-button ${isEdit ? "edit-icon" : "delete-icon"}`;
  button.dataset.itemAction = action;
  button.dataset.itemId = item.id;
  button.title = `${label} ${item.name}`;
  button.setAttribute("aria-label", `${label} ${item.name}`);
  button.innerHTML = isEdit
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
  return button;
}

function getVisibleColumns() {
  return ["name", ...columnToggles.filter((toggle) => toggle.checked).map((toggle) => toggle.dataset.column)];
}

function updateColumnVisibility() {
  const visible = new Set(getVisibleColumns());
  for (const cell of document.querySelectorAll(".consolidated-table [data-column]")) {
    cell.hidden = !visible.has(cell.dataset.column);
  }
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
    tableElement.dataset.sortId = invoice.id;
    tableElement.append(
      createTableHead(
        false,
        false,
        ["name", "code", "quantity", "unit", "unit_price", "total_price"],
        invoice.id
      )
    );
    const body = document.createElement("tbody");
    const totals = document.createElement("tfoot");
    tableElement.append(body, totals);
    table.append(tableElement);
    renderItemTable(body, totals, invoice.products, {
      allowRemoval: false,
      visibleColumns: ["name", "code", "quantity", "unit", "unit_price", "total_price"],
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
  document.querySelector(".consolidated-table thead").replaceWith(
    createTableHead(true, true, getVisibleColumns(), "combined")
  );
  updateColumnVisibility();
}

function createTableHead(
  includeSource,
  allowActions = true,
  visibleColumns = getVisibleColumns(),
  sortId = "combined"
) {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  const columns = [
    ["name", "Item"],
    ["code", "Código"],
    ["quantity", "Qtd"],
    ["unit", "Un"],
    ["unit_price", "Preço un."],
    ["total_price", "Total"],
  ];
  if (includeSource) columns.push(["source", "Origem"]);
  for (const [key, label] of columns) {
    const header = document.createElement("th");
    header.dataset.column = key;
    header.hidden = !visibleColumns.includes(key);
    if (["quantity", "unit_price", "total_price"].includes(key)) header.className = "num";
    const sortButton = document.createElement("button");
    sortButton.type = "button";
    sortButton.className = "sort-button";
    sortButton.dataset.sortColumn = key;
    sortButton.textContent = label;
    const state = sortStates.get(sortId);
    if (state?.column === key) {
      header.setAttribute("aria-sort", state.direction === "asc" ? "ascending" : "descending");
      sortButton.textContent += state.direction === "asc" ? " ▲" : " ▼";
    } else {
      header.setAttribute("aria-sort", "none");
    }
    header.append(sortButton);
    row.append(header);
  }
  if (allowActions) {
    const actions = document.createElement("th");
    actions.className = "actions-column";
    actions.textContent = "Ações";
    row.append(actions);
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

function handleItemAction(event) {
  const button = event.target.closest("button[data-item-action]");
  if (!button) return;

  if (button.dataset.itemAction === "edit") {
    const item = invoiceBook.listItems().find((entry) => entry.id === button.dataset.itemId);
    if (!item) return;
    itemEditForm.dataset.itemId = item.id;
    itemEditForm.elements.namedItem("name").value = item.name;
    itemEditForm.elements.namedItem("code").value = item.code;
    itemEditForm.elements.namedItem("quantity").value = item.quantity;
    itemEditForm.elements.namedItem("unit").value = item.unit;
    itemEditForm.elements.namedItem("unit_price").value = item.unit_price;
    itemEditDialog.showModal();
    itemEditForm.elements.namedItem("name").focus();
    return;
  }

  try {
    const item = invoiceBook.removeItem(button.dataset.itemId);
    renderInvoiceBook();
    itemsStatusEl.textContent = `${item.name} removido da lista de itens.`;
    itemsStatusEl.classList.remove("error");
  } catch (error) {
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
}

itemEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(itemEditForm);
  try {
    const item = invoiceBook.updateItem(itemEditForm.dataset.itemId, {
      name: formData.get("name"),
      code: formData.get("code"),
      quantity: formData.get("quantity"),
      unit: formData.get("unit"),
      unit_price: formData.get("unit_price"),
    });
    itemEditDialog.close();
    renderInvoiceBook();
    itemsStatusEl.textContent = `${item.name} atualizado.`;
    itemsStatusEl.classList.remove("error");
  } catch (error) {
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
});

document.getElementById("cancel-item-edit").addEventListener("click", () => itemEditDialog.close());
for (const toggle of columnToggles) {
  toggle.addEventListener("change", updateColumnVisibility);
}
combinedItemsEl.addEventListener("click", handleItemAction);
invoicesListEl.addEventListener("click", sortTable);
document.querySelector(".consolidated-table").addEventListener("click", sortTable);
renderInvoiceBook();

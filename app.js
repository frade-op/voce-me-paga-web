import { InvoiceBook, sortItems } from "./invoices.mjs";
import { ParticipantRoster } from "./participants.mjs";
import { ItemShares } from "./shares.mjs";
import { extractInvoiceUrl, isCameraContextSecure } from "./qr.mjs";

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
const assignmentDialog = document.getElementById("assignment-dialog");
const assignmentForm = document.getElementById("assignment-form");
const assignmentTitle = document.getElementById("assignment-title");
const assignmentDescription = document.getElementById("assignment-description");
const assignmentOptions = document.getElementById("assignment-options");
const assignmentError = document.getElementById("assignment-error");
const columnToggles = [...document.querySelectorAll(".column-visibility input[data-column]")];
const sortStates = new Map();

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const participants = new ParticipantRoster();
const invoiceBook = new InvoiceBook();
const shares = new ItemShares();
let editingParticipantId = null;
let assignmentTarget = null;

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
        : action === "assign-items"
          ? "participant-items-button"
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
  const participantList = participants.list();
  const totals = shares.calculateTotals(invoiceBook.listItems(), participantList);
  const rows = participantList.map((participant) => {
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
    const summary = document.createElement("div");
    summary.className = "participant-summary";
    const due = document.createElement("span");
    due.className = "participant-due";
    due.textContent = `Deve ${money(totals.get(participant.id) / 100)}`;
    summary.append(identity, due);
    const actions = document.createElement("div");
    actions.className = "participant-actions";
    actions.append(
      createParticipantButton("Editar itens", "assign-items", participant),
      createParticipantButton("Editar", "edit", participant),
      createParticipantButton("Remover", "remove", participant)
    );
    item.append(summary, actions);
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
    renderInvoiceBook();
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
  if (action === "assign-items") {
    try {
      openAssignmentDialog({ type: "participant", participantId });
    } catch (error) {
      setParticipantStatus(error.message, true);
    }
    return;
  }
  if (action === "remove") {
    try {
      const participant = participants.remove(participantId);
      shares.removeParticipant(participantId);
      editingParticipantId = null;
      setParticipantStatus(`${participant.name} removido.`);
      renderParticipants();
      renderInvoiceBook();
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
    renderInvoiceBook();
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

function createItemShareStack(item) {
  const participantsById = new Map(participants.list().map((participant) => [participant.id, participant]));
  const assigned = shares
    .listParticipantIds(item.id)
    .map((id) => participantsById.get(id))
    .filter(Boolean);
  const stack = document.createElement("span");
  stack.className = "item-share-stack";
  const names = assigned.map(({ name }) => name);
  stack.title = names.length ? `Pagantes: ${names.join(", ")}` : "Nenhum pagante atribuído";
  stack.setAttribute(
    "aria-label",
    names.length ? `Pagantes: ${names.join(", ")}` : "Nenhum pagante atribuído"
  );

  const visibleParticipants = assigned.slice(0, 2);
  for (const participant of visibleParticipants) {
    const coin = document.createElement("span");
    coin.className = "item-share-avatar";
    coin.textContent = participant.initials;
    coin.style.backgroundColor = participant.color;
    coin.title = participant.name;
    coin.setAttribute("aria-hidden", "true");
    stack.append(coin);
  }
  if (assigned.length > 2) {
    const count = document.createElement("span");
    count.className = "item-share-count";
    count.textContent = `+${assigned.length - 2}`;
    count.setAttribute("aria-hidden", "true");
    stack.append(count);
  } else if (!assigned.length) {
    const empty = document.createElement("span");
    empty.className = "item-share-empty";
    empty.textContent = "—";
    empty.setAttribute("aria-hidden", "true");
    stack.append(empty);
  }
  return stack;
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
      ["name", item.name, "item-name-cell"],
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
      if (column === "name" && allowRemoval) {
        const content = document.createElement("span");
        content.className = "item-name-content";
        const itemName = document.createElement("span");
        itemName.className = "item-name";
        itemName.textContent = value;
        content.append(itemName, createItemShareStack(item));
        tableCell.replaceChildren(content);
      }
      row.append(tableCell);
    }
    if (allowRemoval) {
      const action = document.createElement("td");
      action.className = "actions-column";
      const actions = document.createElement("div");
      actions.className = "action-buttons";
      actions.id = `actions-${item.id}`;
      actions.append(
        createItemActionButton("assign", item),
        createItemActionButton("edit", item),
        createItemActionButton("remove", item)
      );
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "icon-button actions-toggle";
      toggle.dataset.actionsToggle = "";
      toggle.title = `Ações de ${item.name}`;
      toggle.setAttribute("aria-label", `Ações de ${item.name}`);
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", actions.id);
      toggle.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>';
      const menu = document.createElement("div");
      menu.className = "action-menu";
      menu.append(toggle, actions);
      action.append(menu);
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
  const isAssign = action === "assign";
  const label = isEdit ? "Editar" : isAssign ? "Editar pagantes de" : "Remover";
  button.type = "button";
  const iconClass = isEdit ? "edit-icon" : isAssign ? "assign-icon" : "delete-icon";
  button.className = `icon-button ${iconClass}`;
  button.dataset.itemAction = action;
  button.dataset.itemId = item.id;
  button.title = `${label} ${item.name}`;
  button.setAttribute("aria-label", `${label} ${item.name}`);
  button.innerHTML = isEdit
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>'
    : isAssign
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>'
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
    for (const item of invoice.products) {
      shares.addItem(item.id, participants.list().map(({ id }) => id));
    }
    renderInvoiceBook();
    renderParticipants();
    form.reset();
    const itemLabel = invoice.products.length === 1 ? "item" : "itens";
    const noParticipantsNotice = participants.list().length
      ? ""
      : " Lembre-se de adicionar pagantes caso queira dividir os valores em mais de uma pessoa.";
    setStatus(`Nota ${invoice.number} adicionada com ${invoice.products.length} ${itemLabel}.${noParticipantsNotice}`);
  } catch (error) {
    setStatus(
      error instanceof TypeError ? "Não foi possível conectar ao serviço." : error.message,
      true
    );
  } finally {
    submitBtn.disabled = false;
  }
});

const qrDialog = document.getElementById("qr-dialog");
const qrVideo = document.getElementById("qr-video");
const qrStatusEl = document.getElementById("qr-status");
const qrPhotoInput = document.getElementById("qr-photo-input");
let qrStream = null;
let qrScanning = false;
let qrDetector = null;

function setQrStatus(message, isError = false) {
  qrStatusEl.textContent = message;
  qrStatusEl.classList.toggle("error", isError);
}

function stopQrCamera() {
  qrScanning = false;
  qrStream?.getTracks().forEach((track) => track.stop());
  qrStream = null;
  qrVideo.srcObject = null;
}

function closeQrDialog() {
  stopQrCamera();
  if (qrDialog.open) qrDialog.close();
}

function applyQrResult(text) {
  const url = extractInvoiceUrl(text);
  if (!url) {
    setQrStatus("O QR Code lido não contém um link de nota fiscal.", true);
    return false;
  }
  urlInput.value = url;
  closeQrDialog();
  setStatus("QR Code lido. Confira o link e clique em Adicionar nota.");
  submitBtn.focus();
  return true;
}

function decodeQrFromSource(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(source, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return window.jsQR?.(imageData.data, width, height)?.data ?? null;
}

async function detectQr(source, width, height) {
  if (qrDetector) {
    const [code] = await qrDetector.detect(source);
    if (code) return code.rawValue;
  }
  return decodeQrFromSource(source, width, height);
}

async function scanQrLoop() {
  while (qrScanning) {
    if (qrVideo.readyState >= 2 && qrVideo.videoWidth > 0) {
      try {
        const text = await detectQr(qrVideo, qrVideo.videoWidth, qrVideo.videoHeight);
        if (text && applyQrResult(text)) return;
      } catch {
        // Quadro ilegível; tenta o próximo.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function startQrCamera() {
  if (!isCameraContextSecure() || !navigator.mediaDevices?.getUserMedia) {
    setQrStatus("Câmera ao vivo indisponível aqui. Use Tirar foto.", true);
    return;
  }
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    qrVideo.srcObject = qrStream;
    await qrVideo.play();
    setQrStatus("Procurando QR Code...");
    qrScanning = true;
    scanQrLoop();
  } catch (error) {
    stopQrCamera();
    setQrStatus(
      error?.name === "NotAllowedError"
        ? "Permissão da câmera negada. Libere o acesso ou use Tirar foto."
        : "Não foi possível abrir a câmera. Use Tirar foto.",
      true
    );
  }
}

document.getElementById("scan-qr-btn").addEventListener("click", () => {
  if ("BarcodeDetector" in window && !qrDetector) {
    qrDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
  }
  setQrStatus("");
  qrDialog.showModal();
  startQrCamera();
});

document.getElementById("qr-close-btn").addEventListener("click", closeQrDialog);
qrDialog.addEventListener("close", stopQrCamera);

document.getElementById("qr-photo-btn").addEventListener("click", () => qrPhotoInput.click());

qrPhotoInput.addEventListener("change", async () => {
  const [file] = qrPhotoInput.files;
  qrPhotoInput.value = "";
  if (!file) return;
  setQrStatus("Lendo foto...");
  try {
    const bitmap = await createImageBitmap(file);
    const text = await detectQr(bitmap, bitmap.width, bitmap.height);
    bitmap.close?.();
    if (!text) {
      setQrStatus("Nenhum QR Code encontrado na foto. Tente de novo mais perto.", true);
      return;
    }
    applyQrResult(text);
  } catch {
    setQrStatus("Não foi possível ler a foto.", true);
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
    shares.addItem(item.id, participants.list().map(({ id }) => id));
    manualItemForm.reset();
    renderInvoiceBook();
    renderParticipants();
    itemsStatusEl.textContent = `${item.name} adicionado à compra.`;
    itemsStatusEl.classList.remove("error");
    manualItemForm.elements.namedItem("name").focus();
  } catch (error) {
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
});

function openAssignmentDialog(target) {
  const participantList = participants.list();
  const items = invoiceBook.listItems();
  assignmentTarget = target;
  assignmentError.hidden = true;
  assignmentError.textContent = "";
  assignmentOptions.replaceChildren();

  let options;
  let selectedIds;
  if (target.type === "item") {
    const item = items.find(({ id }) => id === target.itemId);
    if (!item) throw new Error("Item não encontrado.");
    assignmentTitle.textContent = "Quem vai pagar este item?";
    assignmentDescription.textContent = `${item.name} · ${money(item.total_price)}`;
    options = participantList.map((participant) => ({
      id: participant.id,
      label: participant.name,
      color: participant.color,
      initials: participant.initials,
    }));
    selectedIds = new Set(shares.listParticipantIds(item.id));
  } else {
    const participant = participantList.find(({ id }) => id === target.participantId);
    if (!participant) throw new Error("Pagante não encontrado.");
    assignmentTitle.textContent = "Editar itens do pagante";
    assignmentDescription.textContent = `Selecione os itens que ${participant.name} pagará.`;
    options = items.map((item) => ({
      id: item.id,
      label: item.name,
      detail: money(item.total_price),
    }));
    selectedIds = new Set(
      items
        .filter((item) => shares.listParticipantIds(item.id).includes(participant.id))
        .map(({ id }) => id)
    );
  }

  const rows = options.map((option) => {
    const label = document.createElement("label");
    label.className = "assignment-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "selection";
    checkbox.value = option.id;
    checkbox.checked = selectedIds.has(option.id);

    if (option.color) {
      const avatar = document.createElement("span");
      avatar.className = "participant-avatar";
      avatar.style.backgroundColor = option.color;
      avatar.textContent = option.initials;
      avatar.setAttribute("aria-hidden", "true");
      label.append(checkbox, avatar);
    } else {
      label.append(checkbox);
    }
    const name = document.createElement("span");
    name.className = "assignment-option-name";
    name.textContent = option.label;
    label.append(name);
    if (option.detail) {
      const detail = document.createElement("span");
      detail.className = "assignment-option-detail";
      detail.textContent = option.detail;
      label.append(detail);
    }
    return label;
  });
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      target.type === "item"
        ? "Cadastre pagantes antes de atribuir este item."
        : "Adicione itens à compra para configurar o pagamento.";
    rows.push(empty);
  }
  assignmentOptions.replaceChildren(...rows);
  assignmentDialog.showModal();
  assignmentOptions.querySelector("input")?.focus();
}

assignmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!assignmentTarget) return;
  const selectedIds = [
    ...assignmentOptions.querySelectorAll('input[name="selection"]:checked'),
  ].map(({ value }) => value);
  try {
    if (assignmentTarget.type === "item") {
      shares.setItemParticipants(
        assignmentTarget.itemId,
        selectedIds,
        participants.list().map(({ id }) => id)
      );
      itemsStatusEl.textContent = "Pagantes do item atualizados.";
    } else {
      const participant = participants
        .list()
        .find(({ id }) => id === assignmentTarget.participantId);
      shares.setParticipantItems(
        assignmentTarget.participantId,
        selectedIds,
        participants.list().map(({ id }) => id)
      );
      itemsStatusEl.textContent = `Itens de ${participant.name} atualizados.`;
    }
    itemsStatusEl.classList.remove("error");
    assignmentDialog.close();
    renderInvoiceBook();
    renderParticipants();
  } catch (error) {
    assignmentError.hidden = false;
    assignmentError.textContent = error.message;
    itemsStatusEl.textContent = error.message;
    itemsStatusEl.classList.add("error");
  }
});

assignmentDialog.addEventListener("close", () => {
  assignmentTarget = null;
});

document.getElementById("cancel-assignment").addEventListener("click", () => {
  assignmentDialog.close();
});

function handleItemAction(event) {
  const button = event.target.closest("button[data-item-action]");
  if (!button) return;

  if (button.dataset.itemAction === "assign") {
    try {
      openAssignmentDialog({ type: "item", itemId: button.dataset.itemId });
    } catch (error) {
      itemsStatusEl.textContent = error.message;
      itemsStatusEl.classList.add("error");
    }
    return;
  }

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
    shares.removeItem(item.id);
    renderInvoiceBook();
    renderParticipants();
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
    renderParticipants();
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
combinedItemsEl.addEventListener("click", (event) => {
  const toggle = event.target.closest("button[data-actions-toggle]");
  if (!toggle) return;
  const menu = toggle.closest(".action-menu");
  const open = !menu.classList.contains("open");
  menu.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
});
combinedItemsEl.addEventListener("click", handleItemAction);
invoicesListEl.addEventListener("click", sortTable);
document.querySelector(".consolidated-table").addEventListener("click", sortTable);
if (window.matchMedia("(max-width: 600px)").matches) {
  for (const toggle of columnToggles) {
    toggle.checked = toggle.dataset.column === "total_price";
  }
}
renderInvoiceBook();

import { InvoiceBook, sortItems } from "./domain/invoices.mjs";
import { ParticipantRoster } from "./domain/participants.mjs";
import { ItemShares } from "./domain/shares.mjs";
import { extractInvoiceUrl, isCameraContextSecure } from "./domain/qr.mjs";
import { EXPORT_FORMATS, buildSummary, summaryFileName } from "./export.mjs";
import { LOCALES, detectLanguage, translate, translateError, translateSource } from "./i18n.mjs";

const LANGUAGE_STORAGE_KEY = "vc-me-paga-language";
let language = "pt";
try {
  language = detectLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY), navigator.language);
} catch {
  language = detectLanguage(null, navigator.language);
}
const t = (key, params) => translate(language, key, params);
const errorText = (error) => translateError(language, error.message);
const countLabel = (count) => t(count === 1 ? "items.one" : "items.many");

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

let currency;
let quantity;
function updateFormatters() {
  currency = new Intl.NumberFormat(LOCALES[language], { style: "currency", currency: "BRL" });
  quantity = new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 3 });
}
updateFormatters();
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
      label.textContent = t("participants.editFirstName", { name: participant.name });

      const firstNameInput = document.createElement("input");
      firstNameInput.id = `edit-first-name-${participant.id}`;
      firstNameInput.name = "firstName";
      firstNameInput.type = "text";
      firstNameInput.maxLength = 50;
      firstNameInput.placeholder = t("participants.firstName");
      firstNameInput.autocomplete = "given-name";
      firstNameInput.value = participant.firstName;
      firstNameInput.required = true;

      const lastNameInput = document.createElement("input");
      lastNameInput.id = `edit-last-name-${participant.id}`;
      lastNameInput.name = "lastName";
      lastNameInput.type = "text";
      lastNameInput.maxLength = 50;
      lastNameInput.placeholder = t("participants.lastName");
      lastNameInput.autocomplete = "family-name";
      lastNameInput.value = participant.lastName;
      lastNameInput.required = true;

      const actions = document.createElement("div");
      actions.className = "participant-actions";
      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = t("participants.save");
      const cancelButton = createParticipantButton(t("participants.cancel"), "cancel", participant);
      actions.append(saveButton, cancelButton);
      const lastNameLabel = document.createElement("label");
      lastNameLabel.className = "visually-hidden";
      lastNameLabel.htmlFor = lastNameInput.id;
      lastNameLabel.textContent = t("participants.editLastName", { name: participant.name });
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
    due.textContent = t("participants.owes", { amount: money(totals.get(participant.id) / 100) });
    summary.append(identity, due);
    const actions = document.createElement("div");
    actions.className = "participant-actions";
    actions.append(
      createParticipantButton(t("participants.editItems"), "assign-items", participant),
      createParticipantButton(t("participants.edit"), "edit", participant),
      createParticipantButton(t("participants.remove"), "remove", participant)
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
    setParticipantStatus(t("participants.added", { name: participant.name }));
    renderParticipants();
    renderInvoiceBook();
    participantFirstNameInput.focus();
  } catch (error) {
    setParticipantStatus(errorText(error), true);
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
      setParticipantStatus(errorText(error), true);
    }
    return;
  }
  if (action === "remove") {
    try {
      const participant = participants.remove(participantId);
      shares.removeParticipant(participantId);
      editingParticipantId = null;
      setParticipantStatus(t("participants.removed", { name: participant.name }));
      renderParticipants();
      renderInvoiceBook();
    } catch (error) {
      setParticipantStatus(errorText(error), true);
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
    setParticipantStatus(t("participants.updated", { name: participant.name }));
    renderParticipants();
    renderInvoiceBook();
  } catch (error) {
    setParticipantStatus(errorText(error), true);
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
  stack.title = names.length ? t("items.payers", { names: names.join(", ") }) : t("items.noPayers");
  stack.setAttribute("aria-label", stack.title);

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
  const issuedAt = invoice.issued_at ? new Date(invoice.issued_at).toLocaleString(LOCALES[language]) : "-";
  const lines = [
    [t("invoice.issuer"), issuer?.name],
    [t("invoice.cnpj"), issuer?.cnpj],
    [t("invoice.address"), issuer?.address],
    [t("invoice.issuedAt"), issuedAt],
    [t("invoice.numberSeries"), `${invoice.number ?? "-"} / ${invoice.series ?? "-"}`],
    [t("invoice.accessKey"), invoice.access_key],
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
    if (includeSource) columns.push(["source", translateSource(language, item.source), ""]);
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
      toggle.title = t("items.actionsOf", { name: item.name });
      toggle.setAttribute("aria-label", toggle.title);
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
    const message = cell(t("items.none"));
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
      tableCell.textContent = t("items.total", { count: totalItems, itemLabel: countLabel(totalItems) });
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
  const label = isEdit
    ? t("participants.edit")
    : isAssign
      ? t("items.assignPayers")
      : t("participants.remove");
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
  title.textContent = t("invoice.payments");
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
    summary.textContent = t("invoices.summary", {
      number: invoice.number,
      series: invoice.series,
      issuer: invoice.issuer.name,
      count: itemCount,
      itemLabel: countLabel(itemCount),
      total: money(invoice.total_amount ?? itemTotal),
    });

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
    ["name", t("col.name")],
    ["code", t("col.code")],
    ["quantity", t("col.quantity")],
    ["unit", t("col.unit")],
    ["unit_price", t("col.unit_price")],
    ["total_price", t("col.total_price")],
  ];
  if (includeSource) columns.push(["source", t("col.source")]);
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
    actions.textContent = t("col.actions");
    row.append(actions);
  }
  head.append(row);
  return head;
}

function errorMessage(status, body) {
  if (typeof body?.detail === "string") return body.detail;
  if (status === 422) return t("api.422");
  if (status === 502) return t("api.502");
  return t("api.unexpected", { status });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus(t("lookup.loading"));

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
    const noParticipantsNotice = participants.list().length ? "" : t("lookup.noParticipants");
    setStatus(
      t("lookup.added", {
        number: invoice.number,
        count: invoice.products.length,
        itemLabel: countLabel(invoice.products.length),
      }) + noParticipantsNotice
    );
  } catch (error) {
    setStatus(error instanceof TypeError ? t("api.connect") : errorText(error), true);
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
    setQrStatus(t("qr.noLink"), true);
    return false;
  }
  urlInput.value = url;
  closeQrDialog();
  setStatus(t("lookup.qrRead"));
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
    setQrStatus(t("qr.unavailable"), true);
    return;
  }
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    qrVideo.srcObject = qrStream;
    await qrVideo.play();
    setQrStatus(t("qr.searching"));
    qrScanning = true;
    scanQrLoop();
  } catch (error) {
    stopQrCamera();
    setQrStatus(error?.name === "NotAllowedError" ? t("qr.denied") : t("qr.openFailed"), true);
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
  setQrStatus(t("qr.reading"));
  try {
    const bitmap = await createImageBitmap(file);
    const text = await detectQr(bitmap, bitmap.width, bitmap.height);
    bitmap.close?.();
    if (!text) {
      setQrStatus(t("qr.notFound"), true);
      return;
    }
    applyQrResult(text);
  } catch {
    setQrStatus(t("qr.readFailed"), true);
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
    itemsStatusEl.textContent = t("items.manualAdded", { name: item.name });
    itemsStatusEl.classList.remove("error");
    manualItemForm.elements.namedItem("name").focus();
  } catch (error) {
    itemsStatusEl.textContent = errorText(error);
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
    assignmentTitle.textContent = t("assign.itemTitle");
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
    assignmentTitle.textContent = t("assign.participantTitle");
    assignmentDescription.textContent = t("assign.participantDescription", { name: participant.name });
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
        ? t("assign.noParticipants")
        : t("assign.noItems");
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
      itemsStatusEl.textContent = t("assign.itemUpdated");
    } else {
      const participant = participants
        .list()
        .find(({ id }) => id === assignmentTarget.participantId);
      shares.setParticipantItems(
        assignmentTarget.participantId,
        selectedIds,
        participants.list().map(({ id }) => id)
      );
      itemsStatusEl.textContent = t("assign.participantUpdated", { name: participant.name });
    }
    itemsStatusEl.classList.remove("error");
    assignmentDialog.close();
    renderInvoiceBook();
    renderParticipants();
  } catch (error) {
    assignmentError.hidden = false;
    assignmentError.textContent = errorText(error);
    itemsStatusEl.textContent = errorText(error);
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
      itemsStatusEl.textContent = errorText(error);
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
    itemsStatusEl.textContent = t("items.removed", { name: item.name });
    itemsStatusEl.classList.remove("error");
  } catch (error) {
    itemsStatusEl.textContent = errorText(error);
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
    itemsStatusEl.textContent = t("items.updated", { name: item.name });
    itemsStatusEl.classList.remove("error");
  } catch (error) {
    itemsStatusEl.textContent = errorText(error);
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

const exportForm = document.getElementById("export-form");
const exportStatusEl = document.getElementById("export-status");

exportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const items = invoiceBook.listItems();
  const participantList = participants.list();
  if (!items.length && !participantList.length) {
    exportStatusEl.textContent = t("export.empty");
    exportStatusEl.classList.add("error");
    return;
  }
  const format = exportForm.elements.namedItem("format").value;
  const generatedAt = new Date();
  const content = buildSummary({
    format,
    language,
    participants: participantList,
    items,
    shares,
    invoiceCount: invoiceBook.listInvoices().length,
    generatedAt,
  });
  const fileName = summaryFileName(format, generatedAt);
  const url = URL.createObjectURL(new Blob([content], { type: EXPORT_FORMATS[format].mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportStatusEl.textContent = t("export.done", { file: fileName });
  exportStatusEl.classList.remove("error");
});

function applyTranslations() {
  document.documentElement.lang = LOCALES[language];
  document.title = t("meta.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of element.dataset.i18nAttr.split(",")) {
      const [attribute, key] = pair.split(":");
      element.setAttribute(attribute, t(key));
    }
  }
  for (const button of document.querySelectorAll(".lang-button")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === language));
  }
}

function setLanguage(next) {
  if (next === language) return;
  language = next;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Armazenamento indisponível; o idioma vale apenas nesta sessão.
  }
  updateFormatters();
  applyTranslations();
  for (const status of [statusEl, participantStatusEl, itemsStatusEl, exportStatusEl]) {
    status.textContent = "";
  }
  statusEl.hidden = true;
  renderParticipants();
  renderInvoiceBook();
}

document.querySelector(".lang-switch").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-lang]");
  if (button) setLanguage(button.dataset.lang);
});

applyTranslations();
renderParticipants();
renderInvoiceBook();

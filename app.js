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
const resultEl = document.getElementById("result");
const infoEl = document.getElementById("invoice-info");
const itemsEl = document.getElementById("items");
const totalsEl = document.getElementById("totals");
const paymentsEl = document.getElementById("payments");

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const participants = new ParticipantRoster();
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

function renderInfo(invoice) {
  const { issuer } = invoice;
  const issuedAt = invoice.issued_at ? new Date(invoice.issued_at).toLocaleString("pt-BR") : "-";
  const lines = [
    ["Emissor", issuer.name],
    ["CNPJ", issuer.cnpj],
    ["Endereço", issuer.address],
    ["Emissão", issuedAt],
    ["Nota / Série", `${invoice.number ?? "-"} / ${invoice.series ?? "-"}`],
    ["Chave de acesso", invoice.access_key],
  ];
  infoEl.replaceChildren(
    ...lines.map(([label, value]) => {
      const p = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      p.append(strong, value ?? "-");
      return p;
    })
  );
}

function renderItems(invoice) {
  itemsEl.replaceChildren(
    ...invoice.products.map((p) => {
      const tr = document.createElement("tr");
      tr.append(
        cell(p.name),
        cell(p.code),
        cell(quantity.format(Number(p.quantity)), "num"),
        cell(p.unit),
        cell(money(p.unit_price), "num"),
        cell(money(p.total_price), "num")
      );
      return tr;
    })
  );

  const tr = document.createElement("tr");
  const label = cell(`Total (${invoice.total_items ?? invoice.products.length} itens)`);
  label.colSpan = 5;
  tr.append(label, cell(money(invoice.total_amount), "num"));
  totalsEl.replaceChildren(tr);
}

function renderPayments(invoice) {
  if (!invoice.payments.length) {
    paymentsEl.replaceChildren();
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
  paymentsEl.replaceChildren(title, list);
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
  resultEl.hidden = true;
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
    renderInfo(body);
    renderItems(body);
    renderPayments(body);
    resultEl.hidden = false;
    setStatus(null);
  } catch {
    setStatus("Não foi possível conectar ao serviço.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

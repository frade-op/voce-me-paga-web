import assert from "node:assert/strict";
import test from "node:test";

import { buildSummary, summaryFileName } from "../src/export.mjs";
import { detectLanguage, translate, translateError, translateSource } from "../src/i18n.mjs";
import { ItemShares } from "../src/domain/shares.mjs";

function setup() {
  const participants = [
    { id: "p1", name: "Ana Silva" },
    { id: "p2", name: "Bia | Costa" },
  ];
  const items = [
    { id: "i1", name: "Pizza", quantity: 1, unit: "un", unit_price: 10.01, total_price: 10.01, source: "Nota 12" },
    { id: "i2", name: "Suco", quantity: 2, unit: "un", unit_price: 5, total_price: 10, source: "Manual" },
    { id: "i3", name: "Sobra", quantity: 1, unit: "un", unit_price: 3, total_price: 3, source: "Manual" },
  ];
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2"]);
  shares.addItem("i2", ["p2"]);
  shares.addItem("i3", []);
  return { participants, items, shares };
}

const generatedAt = new Date(2026, 0, 5, 10, 30);

test("markdown summary has totals, tables and escaped cells", () => {
  const output = buildSummary({ format: "md", language: "pt", ...setup(), invoiceCount: 1, generatedAt });
  assert.match(output, /^# Resumo da divisão/);
  assert.match(output, /Total da compra:\*\* R\$\s23,01/);
  assert.match(output, /Total sem pagantes:\*\* R\$\s3,00/);
  assert.match(output, /### Ana Silva — Deve R\$\s5,01/);
  assert.match(output, /### Bia \| Costa — Deve R\$\s15,00/);
  assert.match(output, /\| Pizza \| 1 un \|/);
  assert.match(output, /Bia \\\| Costa/);
  assert.match(output, /\| Sobra .* \| — \|/);
});

test("txt summary has no markdown syntax and uses english labels", () => {
  const output = buildSummary({ format: "txt", language: "en", ...setup(), invoiceCount: 1, generatedAt });
  assert.match(output, /^Split summary — vc me paga\n=+/);
  assert.match(output, /Ana Silva — Owes R\$5\.01/);
  assert.match(output, /1\. Pizza — 1 un × R\$10\.01 = R\$10\.01/);
  assert.match(output, /Source: Receipt 12 \| Payers: Ana Silva, Bia \| Costa/);
  assert.doesNotMatch(output, /^#|\*\*/m);
});

test("summary handles empty state", () => {
  const output = buildSummary({
    format: "md",
    language: "en",
    participants: [],
    items: [],
    shares: new ItemShares(),
    generatedAt,
  });
  assert.match(output, /No payers added yet\./);
  assert.match(output, /No items in the purchase\./);
});

test("summaryFileName uses format extension", () => {
  assert.equal(summaryFileName("md", generatedAt), "vc-me-paga-20260105.md");
  assert.equal(summaryFileName("txt", generatedAt), "vc-me-paga-20260105.txt");
});

test("i18n translates messages, errors and sources", () => {
  assert.equal(translate("en", "participants.added", { name: "Ana" }), "Ana added.");
  assert.equal(translate("pt", "participants.added", { name: "Ana" }), "Ana adicionado.");
  assert.equal(translate("xx", "participants.add"), "Adicionar pagante");
  assert.equal(translateError("en", "Pagante não encontrado."), "Payer not found.");
  assert.equal(translateError("en", "Quantidade inválido."), "Invalid quantity.");
  assert.equal(translateError("pt", "Pagante não encontrado."), "Pagante não encontrado.");
  assert.equal(translateSource("en", "Nota 12"), "Receipt 12");
  assert.equal(translateSource("en", "Manual"), "Manual");
  assert.equal(detectLanguage(null, "en-US"), "en");
  assert.equal(detectLanguage("pt", "en-US"), "pt");
  assert.equal(detectLanguage(null, "fr-FR"), "pt");
});

test("both languages define the same keys", async () => {
  const { MESSAGES } = await import("../src/i18n.mjs");
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), Object.keys(MESSAGES.pt).sort());
});

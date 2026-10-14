import assert from "node:assert/strict";
import test from "node:test";
import { InvoiceBook } from "../invoices.mjs";

function invoice(number, products = []) {
  return {
    issuer: { name: `Loja ${number}`, cnpj: "123", address: "Rua A" },
    number,
    series: "1",
    access_key: `access-${number}`,
    issued_at: null,
    total_amount: 100,
    payments: [],
    products,
  };
}

const product = (name, total = 10) => ({
  name,
  code: "A1",
  quantity: 1,
  unit: "un.",
  unit_price: total,
  total_price: total,
});

test("stores multiple invoices and lists their items with source labels", () => {
  const book = new InvoiceBook();
  book.addInvoice(invoice("10", [product("Arroz")]));
  book.addInvoice(invoice("11", [product("Feijão")]));

  assert.equal(book.listInvoices().length, 2);
  assert.deepEqual(
    book.listItems().map(({ name, source }) => [name, source]),
    [
      ["Arroz", "Nota 10 / Série 1"],
      ["Feijão", "Nota 11 / Série 1"],
    ]
  );
});

test("keeps returned invoice data separate from stored state", () => {
  const book = new InvoiceBook();
  const created = book.addInvoice(invoice("10", [product("Arroz")]));
  created.products[0].name = "Changed";
  created.issuer.name = "Changed";

  assert.equal(book.listInvoices()[0].products[0].name, "Arroz");
  assert.equal(book.listInvoices()[0].issuer.name, "Loja 10");
});

test("removes invoice items only from the consolidated list", () => {
  const book = new InvoiceBook();
  const created = book.addInvoice(invoice("10", [product("Arroz"), product("Feijão")]));
  const consolidatedItem = book.listItems()[0];
  const removed = book.removeItem(consolidatedItem.id);

  assert.equal(removed.name, "Arroz");
  assert.deepEqual(book.listInvoices()[0].products.map(({ name }) => name), ["Arroz", "Feijão"]);
  assert.equal(book.listInvoices()[0].total_amount, 100);
  assert.equal(book.listInvoices()[0].total_items, 2);
  assert.deepEqual(book.listItems().map(({ name }) => name), ["Feijão"]);
});

test("adds manual items to the consolidated list and calculates total", () => {
  const book = new InvoiceBook();
  const item = book.addManualItem({
    name: "Refrigerante",
    quantity: "2",
    unit: "un.",
    unit_price: "7.35",
  });

  assert.equal(item.total_price, 14.7);
  assert.equal(book.listItems()[0].source, "Manual");
  assert.deepEqual(book.removeItem(item.id), item);
  assert.deepEqual(book.listItems(), []);
});

test("rejects invalid invoice and manual item data without adding records", () => {
  const book = new InvoiceBook();

  assert.throws(() => book.addInvoice({ products: [{ name: "Invalid" }] }), /Quantidade inválido/);
  assert.equal(book.listInvoices().length, 0);
  assert.throws(
    () =>
      book.addManualItem({
        name: " ",
        quantity: "1",
        unit: "un.",
        unit_price: "2",
      }),
    { message: "Informe o nome do item." }
  );
  assert.deepEqual(book.listItems(), []);
});

test("rejects removal of unknown items", () => {
  const book = new InvoiceBook();

  assert.throws(() => book.removeItem("missing"), { message: "Item não encontrado." });
});

import assert from "node:assert/strict";
import test from "node:test";
import { ItemShares } from "../src/domain/shares.mjs";

const participants = [
  { id: "p1", name: "Ana Silva" },
  { id: "p2", name: "Bia Costa" },
  { id: "p3", name: "Caio Lima" },
];

const items = [
  { id: "i1", total_price: 10 },
  { id: "i2", total_price: 5 },
];

test("stores independent participant assignments for each item", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2"]);
  const returned = shares.listParticipantIds("i1");
  returned.push("p3");

  assert.deepEqual(shares.listParticipantIds("i1"), ["p1", "p2"]);
});

test("does not assign participants who join after the item was created", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1"]);

  assert.deepEqual(shares.listParticipantIds("i1"), ["p1"]);
  assert.deepEqual(
    [...shares.calculateTotals([{ id: "i1", total_price: 10 }], participants)],
    [
      ["p1", 1000],
      ["p2", 0],
      ["p3", 0],
    ]
  );
});

test("splits item amounts evenly and assigns remainder cents by participant order", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2", "p3"]);
  shares.addItem("i2", ["p1", "p2"]);

  assert.deepEqual([...shares.calculateTotals([{ id: "i1", total_price: 0.1 }], participants)], [
    ["p1", 4],
    ["p2", 3],
    ["p3", 3],
  ]);
  assert.deepEqual([...shares.calculateTotals(items, participants)], [
    ["p1", 584],
    ["p2", 583],
    ["p3", 333],
  ]);
});

test("updates item assignments and recalculates each participant total", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2"]);
  shares.addItem("i2", ["p1", "p2"]);

  shares.setItemParticipants("i1", ["p1"], participants.map(({ id }) => id));
  assert.deepEqual([...shares.calculateTotals(items, participants)], [
    ["p1", 1250],
    ["p2", 250],
    ["p3", 0],
  ]);
});

test("updates one participant's selected items without changing other assignments", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2"]);
  shares.addItem("i2", ["p1", "p2"]);

  shares.setParticipantItems("p1", ["i2"], participants.map(({ id }) => id));

  assert.deepEqual(shares.listParticipantIds("i1"), ["p2"]);
  assert.deepEqual(shares.listParticipantIds("i2"), ["p1", "p2"]);
});

test("removes participant assignments and deletes shares when an item is removed", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1", "p2"]);
  shares.addItem("i2", ["p1"]);

  shares.removeParticipant("p1");
  assert.deepEqual(shares.listParticipantIds("i1"), ["p2"]);
  assert.deepEqual(shares.listParticipantIds("i2"), []);
  shares.removeItem("i2");
  assert.throws(() => shares.listParticipantIds("i2"), {
    message: "Item não encontrado para divisão.",
  });
});

test("rejects unknown participants, unknown items, and malformed assignments", () => {
  const shares = new ItemShares();
  shares.addItem("i1", ["p1"]);

  assert.throws(
    () => shares.setItemParticipants("i1", ["missing"], participants.map(({ id }) => id)),
    { message: "Um ou mais pagantes não existem." }
  );
  assert.throws(
    () => shares.setParticipantItems("missing", ["i1"], participants.map(({ id }) => id)),
    { message: "Pagante não encontrado." }
  );
  assert.throws(
    () => shares.setParticipantItems("p1", ["missing"], participants.map(({ id }) => id)),
    { message: "Um ou mais itens não existem." }
  );
});

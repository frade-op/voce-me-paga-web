import assert from "node:assert/strict";
import test from "node:test";
import { ParticipantRoster } from "../participants.mjs";

test("adds trimmed participant names and returns independent records", () => {
  const roster = new ParticipantRoster();

  const participant = roster.add("  Ana  ");
  participant.name = "Changed outside the roster";

  assert.deepEqual(roster.list(), [{ id: "participant-1", name: "Ana" }]);
});

test("rejects empty and duplicate names without changing the roster", () => {
  const roster = new ParticipantRoster();
  roster.add("Ana");

  assert.throws(() => roster.add("  "), { message: "Informe o nome do pagante." });
  assert.throws(() => roster.add(" ana "), {
    message: "Já existe um pagante com esse nome.",
  });
  assert.deepEqual(roster.list().map(({ name }) => name), ["Ana"]);
});

test("renames participant while allowing its current name", () => {
  const roster = new ParticipantRoster();
  const participant = roster.add("Ana");

  assert.deepEqual(roster.rename(participant.id, "  Ana  "), participant);
  assert.deepEqual(roster.rename(participant.id, "Beatriz"), {
    id: participant.id,
    name: "Beatriz",
  });
});

test("rejects duplicate renames and preserves the existing name", () => {
  const roster = new ParticipantRoster();
  const first = roster.add("Ana");
  const second = roster.add("Bia");

  assert.throws(() => roster.rename(second.id, " ana "), {
    message: "Já existe um pagante com esse nome.",
  });
  assert.deepEqual(roster.list().map(({ name }) => name), ["Ana", "Bia"]);
  assert.throws(() => roster.rename(second.id, ""), {
    message: "Informe o nome do pagante.",
  });
  assert.equal(roster.list()[1].name, "Bia");
  assert.equal(first.name, "Ana");
});

test("removes participants and reports unknown ids", () => {
  const roster = new ParticipantRoster();
  const participant = roster.add("Ana");

  assert.deepEqual(roster.remove(participant.id), participant);
  assert.deepEqual(roster.list(), []);
  assert.throws(() => roster.remove(participant.id), {
    message: "Pagante não encontrado.",
  });
});

test("does not share participants between purchase rosters", () => {
  const firstPurchase = new ParticipantRoster();
  const secondPurchase = new ParticipantRoster();
  firstPurchase.add("Ana");

  assert.deepEqual(secondPurchase.list(), []);
});

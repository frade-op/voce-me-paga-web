import assert from "node:assert/strict";
import test from "node:test";
import { ParticipantRoster } from "../participants.mjs";

test("adds trimmed first and last names with initials and a random avatar color", () => {
  const roster = new ParticipantRoster();

  const participant = roster.add("  Ana  ", "  Silva  ");
  participant.name = "Changed outside the roster";

  assert.deepEqual(roster.list(), [
    {
      id: "participant-1",
      firstName: "Ana",
      lastName: "Silva",
      name: "Ana Silva",
      initials: "AS",
      color: participant.color,
    },
  ]);
  assert.match(participant.color, /^#[\da-f]{6}$/i);
});

test("normalizes accented names and valid spaces, apostrophes, and hyphens", () => {
  const roster = new ParticipantRoster();

  assert.equal(roster.add("  Maria  Clara ", " D'Ávila-Souza ").name, "Maria Clara D'Ávila-Souza");
  assert.equal(roster.list()[0].initials, "MD");
});

test("rejects invalid or missing name parts and duplicate full names", () => {
  const roster = new ParticipantRoster();
  roster.add("Ana", "Silva");

  assert.throws(() => roster.add("", "Silva"), {
    message: "Informe nome e sobrenome válidos, usando apenas letras.",
  });
  assert.throws(() => roster.add("Ana", ""), {
    message: "Informe nome e sobrenome válidos, usando apenas letras.",
  });
  assert.throws(() => roster.add("Ana2", "Costa"), {
    message: "Informe nome e sobrenome válidos, usando apenas letras.",
  });
  assert.throws(() => roster.add("Ana", "123"), {
    message: "Informe nome e sobrenome válidos, usando apenas letras.",
  });
  assert.throws(() => roster.add(" ana ", " SILVA "), {
    message: "Já existe um pagante com esse nome.",
  });
  assert.deepEqual(roster.list().map(({ name }) => name), ["Ana Silva"]);
});

test("renames participant and recalculates initials while retaining avatar color", () => {
  const roster = new ParticipantRoster();
  const participant = roster.add("Ana", "Silva");

  assert.deepEqual(roster.rename(participant.id, "  Ana ", " Silva  "), participant);
  const renamed = roster.rename(participant.id, "Beatriz", "Oliveira");
  assert.equal(renamed.name, "Beatriz Oliveira");
  assert.equal(renamed.initials, "BO");
  assert.equal(renamed.color, participant.color);
});

test("rejects duplicate or invalid renames without changing participant", () => {
  const roster = new ParticipantRoster();
  const first = roster.add("Ana", "Silva");
  const second = roster.add("Bia", "Costa");

  assert.throws(() => roster.rename(second.id, " ana ", "silva"), {
    message: "Já existe um pagante com esse nome.",
  });
  assert.throws(() => roster.rename(second.id, "Bia2", "Costa"), {
    message: "Informe nome e sobrenome válidos, usando apenas letras.",
  });
  assert.deepEqual(roster.list().map(({ name }) => name), ["Ana Silva", "Bia Costa"]);
  assert.equal(first.name, "Ana Silva");
});

test("removes participants and reports unknown ids", () => {
  const roster = new ParticipantRoster();
  const participant = roster.add("Ana", "Silva");

  assert.deepEqual(roster.remove(participant.id), participant);
  assert.deepEqual(roster.list(), []);
  assert.throws(() => roster.remove(participant.id), {
    message: "Pagante não encontrado.",
  });
});

test("does not share participants between purchase rosters", () => {
  const firstPurchase = new ParticipantRoster();
  const secondPurchase = new ParticipantRoster();
  firstPurchase.add("Ana", "Silva");

  assert.deepEqual(secondPurchase.list(), []);
});

function normalizeName(name) {
  if (typeof name !== "string") {
    throw new TypeError("Nome inválido.");
  }

  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Informe o nome do pagante.");
  }

  return normalized;
}

export class ParticipantRoster {
  #participants = [];
  #nextId = 1;

  list() {
    return this.#participants.map((participant) => ({ ...participant }));
  }

  add(name) {
    const normalized = normalizeName(name);
    this.#assertUniqueName(normalized);

    const participant = {
      id: `participant-${this.#nextId++}`,
      name: normalized,
    };
    this.#participants.push(participant);
    return { ...participant };
  }

  rename(id, name) {
    const participant = this.#find(id);
    const normalized = normalizeName(name);
    this.#assertUniqueName(normalized, id);
    participant.name = normalized;
    return { ...participant };
  }

  remove(id) {
    const index = this.#participants.findIndex((participant) => participant.id === id);
    if (index < 0) {
      throw new Error("Pagante não encontrado.");
    }
    return this.#participants.splice(index, 1)[0];
  }

  #find(id) {
    const participant = this.#participants.find((entry) => entry.id === id);
    if (!participant) {
      throw new Error("Pagante não encontrado.");
    }
    return participant;
  }

  #assertUniqueName(name, excludedId) {
    const normalizedName = name.toLocaleLowerCase("pt-BR");
    const duplicate = this.#participants.some(
      (participant) =>
        participant.id !== excludedId &&
        participant.name.toLocaleLowerCase("pt-BR") === normalizedName
    );
    if (duplicate) {
      throw new Error("Já existe um pagante com esse nome.");
    }
  }
}

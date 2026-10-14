const AVATAR_COLORS = ["#047857", "#0f766e", "#0369a1", "#4338ca", "#7e22ce", "#be123c", "#c2410c"];
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

function normalizeNamePart(value) {
  if (typeof value !== "string") {
    throw new TypeError("Nome inválido.");
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!NAME_PATTERN.test(normalized)) {
    throw new Error("Informe nome e sobrenome válidos, usando apenas letras.");
  }

  return normalized;
}

function createParticipantName(firstName, lastName) {
  return {
    firstName: normalizeNamePart(firstName),
    lastName: normalizeNamePart(lastName),
  };
}

function createParticipantRecord(id, firstName, lastName, color) {
  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    initials: `${firstName[0]}${lastName[0]}`.toLocaleUpperCase("pt-BR"),
    color,
  };
}

export class ParticipantRoster {
  #participants = [];
  #nextId = 1;

  list() {
    return this.#participants.map((participant) => ({ ...participant }));
  }

  add(firstName, lastName) {
    const normalized = createParticipantName(firstName, lastName);
    const name = `${normalized.firstName} ${normalized.lastName}`;
    this.#assertUniqueName(name);

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const participant = createParticipantRecord(
      `participant-${this.#nextId++}`,
      normalized.firstName,
      normalized.lastName,
      color
    );
    this.#participants.push(participant);
    return { ...participant };
  }

  rename(id, firstName, lastName) {
    const participant = this.#find(id);
    const normalized = createParticipantName(firstName, lastName);
    const name = `${normalized.firstName} ${normalized.lastName}`;
    this.#assertUniqueName(name, id);
    Object.assign(
      participant,
      createParticipantRecord(id, normalized.firstName, normalized.lastName, participant.color)
    );
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

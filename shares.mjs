function normalizeIds(ids, label) {
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) {
    throw new Error(`${label} inválidos.`);
  }
  return [...new Set(ids)];
}

export class ItemShares {
  #participantIdsByItem = new Map();

  addItem(itemId, participantIds = []) {
    if (typeof itemId !== "string" || !itemId || this.#participantIdsByItem.has(itemId)) {
      throw new Error("Item inválido para divisão.");
    }
    this.#participantIdsByItem.set(itemId, normalizeIds(participantIds, "Pagantes"));
  }

  removeItem(itemId) {
    if (!this.#participantIdsByItem.delete(itemId)) {
      throw new Error("Item não encontrado para divisão.");
    }
  }

  removeParticipant(participantId) {
    for (const participantIds of this.#participantIdsByItem.values()) {
      const index = participantIds.indexOf(participantId);
      if (index >= 0) participantIds.splice(index, 1);
    }
  }

  listParticipantIds(itemId) {
    const participantIds = this.#participantIdsByItem.get(itemId);
    if (!participantIds) throw new Error("Item não encontrado para divisão.");
    return [...participantIds];
  }

  setItemParticipants(itemId, participantIds, validParticipantIds) {
    if (!this.#participantIdsByItem.has(itemId)) {
      throw new Error("Item não encontrado para divisão.");
    }
    const normalizedIds = normalizeIds(participantIds, "Pagantes");
    const validIds = new Set(validParticipantIds);
    if (normalizedIds.some((id) => !validIds.has(id))) {
      throw new Error("Um ou mais pagantes não existem.");
    }
    this.#participantIdsByItem.set(itemId, normalizedIds);
  }

  setParticipantItems(participantId, itemIds, validParticipantIds) {
    if (!validParticipantIds.includes(participantId)) {
      throw new Error("Pagante não encontrado.");
    }
    const normalizedIds = normalizeIds(itemIds, "Itens");
    const validItemIds = new Set(this.#participantIdsByItem.keys());
    if (normalizedIds.some((id) => !validItemIds.has(id))) {
      throw new Error("Um ou mais itens não existem.");
    }
    const selectedItems = new Set(normalizedIds);
    for (const [itemId, participantIds] of this.#participantIdsByItem) {
      const hasParticipant = participantIds.includes(participantId);
      const shouldHaveParticipant = selectedItems.has(itemId);
      if (hasParticipant === shouldHaveParticipant) continue;
      this.#participantIdsByItem.set(
        itemId,
        shouldHaveParticipant
          ? [...participantIds, participantId]
          : participantIds.filter((id) => id !== participantId)
      );
    }
  }

  calculateTotals(items, participants) {
    const totals = new Map(participants.map(({ id }) => [id, 0]));
    const participantOrder = new Map(participants.map(({ id }, index) => [id, index]));

    for (const item of items) {
      const assigned = this.listParticipantIds(item.id)
        .filter((id) => totals.has(id))
        .sort((left, right) => participantOrder.get(left) - participantOrder.get(right));
      if (!assigned.length) continue;

      const totalCents = Math.round(Number(item.total_price) * 100);
      const baseShare = Math.floor(totalCents / assigned.length);
      const remainder = totalCents % assigned.length;
      assigned.forEach((participantId, index) => {
        totals.set(participantId, totals.get(participantId) + baseShare + Number(index < remainder));
      });
    }

    return totals;
  }
}

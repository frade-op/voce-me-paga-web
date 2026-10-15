import { LOCALES, normalizeLanguage, translate, translateSource } from "./i18n.mjs";

export const EXPORT_FORMATS = {
  txt: { extension: "txt", mime: "text/plain;charset=utf-8" },
  md: { extension: "md", mime: "text/markdown;charset=utf-8" },
};

function escapeCell(text) {
  return String(text ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildModel({ participants, items, shares, invoiceCount }) {
  const totals = shares.calculateTotals(items, participants);
  const rows = items.map((item) => {
    const assignedIds = new Set(shares.listParticipantIds(item.id));
    const assigned = participants.filter(({ id }) => assignedIds.has(id));
    const perParticipant = shares.calculateTotals([item], assigned);
    return { item, assigned, perParticipant };
  });
  const purchaseCents = items.reduce((sum, item) => sum + Math.round(Number(item.total_price) * 100), 0);
  const assignedCents = [...totals.values()].reduce((sum, cents) => sum + cents, 0);
  return { totals, rows, purchaseCents, assignedCents, invoiceCount };
}

export function buildSummary({
  format = "md",
  language = "pt",
  participants,
  items,
  shares,
  invoiceCount = 0,
  generatedAt = new Date(),
}) {
  const lang = normalizeLanguage(language);
  const locale = LOCALES[lang];
  const t = (key, params) => translate(lang, key, params);
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" });
  const quantity = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const cents = (value) => currency.format(value / 100);
  const money = (value) => currency.format(Number(value));
  const { totals, rows, purchaseCents, assignedCents } = buildModel({
    participants,
    items,
    shares,
    invoiceCount,
  });
  const timestamp = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(
    generatedAt
  );
  const markdown = format === "md";

  const overview = [
    [t("summary.totalPurchase"), money(purchaseCents / 100)],
    [t("summary.totalAssigned"), cents(assignedCents)],
    [t("summary.totalUnassigned"), cents(purchaseCents - assignedCents)],
    [t("summary.itemCount"), String(items.length)],
    [t("summary.participantCount"), String(participants.length)],
    [t("summary.invoiceCount"), String(invoiceCount)],
  ];

  const describeItem = (item) =>
    `${quantity.format(item.quantity)} ${item.unit} × ${money(item.unit_price)}`;
  const lines = [];

  if (markdown) {
    lines.push(`# ${t("summary.title")}`, "", `**${t("summary.generatedAt")}:** ${timestamp}`, "");
    lines.push(`## ${t("summary.overview")}`, "");
    for (const [label, value] of overview) lines.push(`- **${label}:** ${value}`);

    lines.push("", `## ${t("summary.participants")}`, "");
    if (!participants.length) lines.push(t("summary.noParticipants"));
    for (const participant of participants) {
      lines.push(`### ${participant.name} — ${t("summary.owes")} ${cents(totals.get(participant.id))}`, "");
      const own = rows.filter(({ assigned }) => assigned.some(({ id }) => id === participant.id));
      if (own.length) {
        lines.push(
          `| ${t("col.name")} | ${t("col.quantity")} | ${t("summary.share")} |`,
          "| --- | ---: | ---: |"
        );
        for (const { item, perParticipant } of own) {
          lines.push(
            `| ${escapeCell(item.name)} | ${quantity.format(item.quantity)} ${escapeCell(item.unit)} | ${cents(
              perParticipant.get(participant.id)
            )} |`
          );
        }
        lines.push("");
      }
    }

    lines.push(`## ${t("summary.items")}`, "");
    if (!items.length) {
      lines.push(t("summary.noItems"));
    } else {
      lines.push(
        `| ${t("col.name")} | ${t("col.quantity")} | ${t("col.unit_price")} | ${t("col.total_price")} | ${t(
          "col.source"
        )} | ${t("summary.payers")} |`,
        "| --- | ---: | ---: | ---: | --- | --- |"
      );
      for (const { item, assigned } of rows) {
        lines.push(
          `| ${escapeCell(item.name)} | ${quantity.format(item.quantity)} ${escapeCell(item.unit)} | ${money(
            item.unit_price
          )} | ${money(item.total_price)} | ${escapeCell(translateSource(lang, item.source))} | ${
            escapeCell(assigned.map(({ name }) => name).join(", ")) || t("summary.noPayers")
          } |`
        );
      }
    }
    return `${lines.join("\n").trimEnd()}\n`;
  }

  lines.push(t("summary.title"), "=".repeat(t("summary.title").length), "");
  lines.push(`${t("summary.generatedAt")}: ${timestamp}`, "");
  lines.push(t("summary.overview").toUpperCase(), "");
  for (const [label, value] of overview) lines.push(`${label}: ${value}`);

  lines.push("", t("summary.participants").toUpperCase(), "");
  if (!participants.length) lines.push(t("summary.noParticipants"));
  for (const participant of participants) {
    lines.push(`${participant.name} — ${t("summary.owes")} ${cents(totals.get(participant.id))}`);
    for (const { item, assigned, perParticipant } of rows) {
      if (!assigned.some(({ id }) => id === participant.id)) continue;
      lines.push(
        `  - ${item.name} (${quantity.format(item.quantity)} ${item.unit}): ${cents(
          perParticipant.get(participant.id)
        )}`
      );
    }
    lines.push("");
  }

  lines.push(t("summary.items").toUpperCase(), "");
  if (!items.length) lines.push(t("summary.noItems"));
  rows.forEach(({ item, assigned }, index) => {
    lines.push(`${index + 1}. ${item.name} — ${describeItem(item)} = ${money(item.total_price)}`);
    lines.push(
      `   ${t("col.source")}: ${translateSource(lang, item.source)} | ${t("summary.payers")}: ${
        assigned.map(({ name }) => name).join(", ") || t("summary.noPayers")
      }`
    );
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

export function summaryFileName(format, generatedAt = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${generatedAt.getFullYear()}${pad(generatedAt.getMonth() + 1)}${pad(generatedAt.getDate())}`;
  return `vc-me-paga-${stamp}.${EXPORT_FORMATS[format].extension}`;
}

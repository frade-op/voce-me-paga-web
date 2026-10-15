import assert from "node:assert/strict";
import test from "node:test";

import { extractInvoiceUrl, isCameraContextSecure } from "../src/domain/qr.mjs";

test("extrai URL http(s) do texto do QR Code", () => {
  const url = "https://www.fazenda.gov.br/nfce/qrcode?p=123|2|1|1|ABC";
  assert.equal(extractInvoiceUrl(`  ${url}  `), new URL(url).href);
  assert.equal(extractInvoiceUrl(`NFC-e ${url}`), new URL(url).href);
  assert.equal(extractInvoiceUrl("http://exemplo.com/nota"), "http://exemplo.com/nota");
});

test("rejeita conteúdo que não é URL http(s)", () => {
  assert.equal(extractInvoiceUrl(""), null);
  assert.equal(extractInvoiceUrl(null), null);
  assert.equal(extractInvoiceUrl("texto qualquer"), null);
  assert.equal(extractInvoiceUrl("ftp://exemplo.com/nota"), null);
  assert.equal(extractInvoiceUrl("javascript:alert(1)"), null);
});

test("câmera exige contexto seguro ou localhost", () => {
  assert.equal(isCameraContextSecure({ hostname: "exemplo.com" }, true), true);
  assert.equal(isCameraContextSecure({ hostname: "localhost" }, false), true);
  assert.equal(isCameraContextSecure({ hostname: "127.0.0.1" }, false), true);
  assert.equal(isCameraContextSecure({ hostname: "192.168.0.5" }, false), false);
});

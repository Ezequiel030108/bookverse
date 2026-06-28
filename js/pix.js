/* ============================================================
   BOOKVERSE — GERADOR DE "PIX COPIA E COLA" (BR Code)
   ------------------------------------------------------------
   Monta o código Pix padrão do Banco Central (EMV/MPM) com o
   valor exato do pedido, a partir da SUA chave Pix (configurada
   em js/config.js). Esse mesmo código vira o QR Code.

   Não precisa mexer aqui.
   ============================================================ */

(function (root) {

  /* Campo no formato EMV: id + tamanho(2 dígitos) + valor. */
  function emv(id, valor) {
    const v = String(valor);
    return id + String(v.length).padStart(2, "0") + v;
  }

  /* Remove acentos e caracteres não-ASCII (o Pix só aceita ASCII). */
  function soAscii(txt) {
    return String(txt || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }

  /* CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF) — exigido pelo Pix. */
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /* Gera o "Pix Copia e Cola" completo.
     opts = { chave, nome, cidade, valor (número), txid } */
  function gerarPayload(opts) {
    const chave  = soAscii(opts.chave);
    const nome   = (soAscii(opts.nome).slice(0, 25)) || "RECEBEDOR";
    const cidade = (soAscii(opts.cidade).slice(0, 15).toUpperCase()) || "BRASIL";
    const valor  = Number(opts.valor || 0).toFixed(2);
    let txid     = soAscii(opts.txid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
    if (!txid) txid = "***";

    const merchantAccount = emv("26", emv("00", "br.gov.bcb.pix") + emv("01", chave));
    const adicional       = emv("62", emv("05", txid));

    const semCRC =
      emv("00", "01") +     // Payload Format Indicator
      merchantAccount +     // Conta do recebedor (chave Pix)
      emv("52", "0000") +   // Merchant Category Code
      emv("53", "986") +    // Moeda: 986 = BRL
      emv("54", valor) +    // Valor da transação
      emv("58", "BR") +     // País
      emv("59", nome) +     // Nome do recebedor
      emv("60", cidade) +   // Cidade
      adicional +           // Campo adicional (txid / código do pedido)
      "6304";               // CRC: id + tamanho, valor calculado a seguir

    return semCRC + crc16(semCRC);
  }

  /* Validação simples: confere o CRC de um payload existente. */
  function validar(payload) {
    if (typeof payload !== "string" || payload.length < 8) return false;
    const corpo = payload.slice(0, -4);
    const crc = payload.slice(-4).toUpperCase();
    return crc16(corpo) === crc;
  }

  root.Pix = { gerarPayload, crc16, validar };

})(typeof window !== "undefined" ? window : globalThis);

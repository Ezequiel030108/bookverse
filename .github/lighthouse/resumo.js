// Resume um relatório JSON do Lighthouse em texto (para ler no log do CI).
const fs = require("fs");
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const a = r.audits;
const out = [];
const p = (...x) => out.push(x.join(" "));
const kb = b => Math.round((b || 0) / 1024) + "KB";
p("URL:", r.finalDisplayedUrl, "| Lighthouse", r.lighthouseVersion, "|", r.configSettings.formFactor, r.configSettings.throttlingMethod);
p("NOTAS:", Object.values(r.categories).map(c => c.id + "=" + Math.round(c.score * 100)).join(" "));
for (const id of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index", "interactive", "max-potential-fid"]) {
  if (a[id]) p("  ", id, a[id].displayValue, "score=" + a[id].score);
}
function itens(id, campos, n) {
  const au = a[id]; if (!au) return;
  const d = au.details || {};
  p("--", id, "|", au.title, "|", au.displayValue || "", "| score=" + au.score);
  const lista = d.items || [];
  lista.slice(0, n || 12).forEach(it => {
    p("     ", campos.map(c => {
      let v = it[c];
      if (v && typeof v === "object") v = v.snippet || v.selector || v.url || v.text || JSON.stringify(v).slice(0, 160);
      if (typeof v === "number") v = /bytes|Size|Bytes/i.test(c) ? kb(v) : Math.round(v);
      return c + "=" + String(v == null ? "" : v).slice(0, 170);
    }).join(" | "));
    if (it.subItems && it.subItems.items) it.subItems.items.slice(0, 4).forEach(s => p("         ·", JSON.stringify(s).slice(0, 220)));
  });
}
// LCP: elemento e fases
const lcpEl = a["largest-contentful-paint-element"];
if (lcpEl && lcpEl.details && lcpEl.details.items) {
  p("-- LCP elemento/fases:");
  lcpEl.details.items.forEach(t => (t.items || []).forEach(it => p("     ", JSON.stringify(it).slice(0, 400))));
}
itens("lcp-lazy-loaded", ["node"]);
itens("prioritize-lcp-image", ["node", "url", "wastedMs"]);
itens("render-blocking-resources", ["url", "totalBytes", "wastedMs"]);
itens("bootup-time", ["url", "total", "scripting", "scriptParseCompile"], 14);
itens("mainthread-work-breakdown", ["groupLabel", "duration"], 10);
itens("third-party-summary", ["entity", "transferSize", "blockingTime", "mainThreadTime"], 10);
itens("long-tasks", ["url", "startTime", "duration"], 15);
itens("unused-javascript", ["url", "totalBytes", "wastedBytes"], 10);
itens("unused-css-rules", ["url", "totalBytes", "wastedBytes"], 5);
itens("unminified-css", ["url", "totalBytes", "wastedBytes"]);
itens("unminified-javascript", ["url", "totalBytes", "wastedBytes"]);
itens("uses-responsive-images", ["url", "totalBytes", "wastedBytes"], 10);
itens("offscreen-images", ["url", "totalBytes", "wastedBytes"], 10);
itens("modern-image-formats", ["url", "totalBytes", "wastedBytes"], 10);
itens("uses-optimized-images", ["url", "totalBytes", "wastedBytes"], 10);
itens("uses-text-compression", ["url", "totalBytes", "wastedBytes"]);
itens("uses-long-cache-ttl", ["url", "cacheLifetimeMs", "totalBytes"], 15);
itens("font-display", ["url", "wastedMs"]);
itens("layout-shifts", ["node", "score"], 10);
itens("non-composited-animations", ["node", "failureReason"], 8);
itens("unsized-images", ["node", "url"], 8);
itens("dom-size", ["statistic", "node", "value"]);
itens("total-byte-weight", ["url", "totalBytes"], 20);
itens("network-rtt", ["origin", "rtt"], 6);
itens("critical-request-chains", [], 0);
const crc = a["critical-request-chains"];
if (crc && crc.details && crc.details.chains) {
  const walk = (ch, d) => Object.values(ch).forEach(n => { p("      " + "  ".repeat(d) + (n.request.url || "").slice(0, 120), Math.round((n.request.endTime - n.request.startTime) * 1000) + "ms", kb(n.request.transferSize)); if (n.children) walk(n.children, d + 1); });
  walk(crc.details.chains, 0);
}
// Acessibilidade: o que falhou
const ac = r.categories.accessibility;
if (ac) {
  p("== ACESSIBILIDADE: falhas");
  ac.auditRefs.forEach(ref => {
    const au = a[ref.id];
    if (au && au.score !== null && au.score < 1 && au.scoreDisplayMode !== "notApplicable" && au.scoreDisplayMode !== "manual" && au.scoreDisplayMode !== "informative") {
      p("--", ref.id, "| peso", ref.weight, "|", au.title);
      ((au.details && au.details.items) || []).slice(0, 10).forEach(it => p("     ", JSON.stringify({ node: it.node && (it.node.selector + " :: " + (it.node.snippet || "").slice(0, 140)), expl: it.node && (it.node.explanation || "").slice(0, 220) })));
    }
  });
}
console.log(out.join("\n"));

const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const { XMLBuilder } = require("fast-xml-parser");

// Reuse existing backend libs/handlers where possible
const { handleScrape } = require("../handlers/scrapeHandler");
const xmlUtils = require("../lib/xmlUtils");

// Helper to map joined items from server-side data
function parseXmlItemsFromData(filename) {
  const dataDir = path.join(__dirname, "../..", "data");
  const file = path.join(dataDir, filename);
  if (!fs.existsSync(file)) return [];
  const xml = fs.readFileSync(file, "utf8");
  let parsed;
  xml2js.parseString(
    xml,
    { explicitArray: false, mergeAttrs: true, explicitCharkey: false },
    (err, res) => {
      if (err) throw err;
      parsed = res;
    }
  );
  const { items } = xmlUtils.extractItems(parsed);
  const arr = Array.isArray(items) ? items : items ? [items] : [];
  return arr;
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function joinDataServer() {
  const artikli = parseXmlItemsFromData("artikli.xml");
  const dobavitelji = parseXmlItemsFromData("dobavitelji.xml");
  const narocila = parseXmlItemsFromData("narocila.xml");
  const stranke = parseXmlItemsFromData("stranke.xml");

  const byId = (arr) => {
    const m = new Map();
    for (const it of arr) m.set(String(it.id || it.ID || ""), it);
    return m;
  };

  const artikliById = byId(artikli);
  const dobById = byId(dobavitelji);
  const strById = byId(stranke);

  const out = [];
  for (const n of narocila) {
    const artikelId = String(n.artikelId || n.artikelID || n.artikel || "");
    const a = artikliById.get(artikelId) || {};
    const d = dobById.get(String(a.dobaviteljId || a.dobaviteljID || "")) || {};
    const s = strById.get(String(n.strankaId || n.strankaID || "")) || {};
    out.push({
      artikelId,
      naziv: a.naziv || "",
      kategorija: a.kategorija || "",
      zaloga: toNumber(a.zaloga),
      dobaviteljId: a.dobaviteljId || "",
      dobaviteljNaziv: d.naziv || "",
      narociloId: n.id || "",
      status: n.status || "",
      strankaId: n.strankaId || "",
      strankaIme: s.ime || "",
    });
  }
  return out;
}

function applyFilters(items, filters) {
  if (!filters || filters.length === 0) return items;
  let result = items;
  for (const f of filters) {
    const field = f.field;
    const val = f.value;
    const op = f.operator || "contains";
    result = result.filter((it) => {
      const v = it[field];
      if (v == null) return false;
      const numV = Number(v);
      const numVal = Number(val);
      switch (op) {
        case "equals":
          return String(v) === String(val);
        case "greaterThan":
          return numV > numVal;
        case "lessThan":
          return numV < numVal;
        case "greaterEqual":
          return numV >= numVal;
        case "lessEqual":
          return numV <= numVal;
        case "contains":
        default:
          return String(v).toLowerCase().includes(String(val).toLowerCase());
      }
    });
  }
  return result;
}

// gRPC handlers
module.exports = {
  ListDocuments(call, callback) {
    try {
      const dataDir = path.join(__dirname, "../..", "data");
      const files = fs.readdirSync(dataDir);
      const docs = files.filter(
        (f) => f.endsWith(".xml") || f.endsWith(".px") || f.endsWith(".json")
      );
      callback(null, { documents: docs });
    } catch (err) {
      callback(err);
    }
  },

  JoinData(call, callback) {
    try {
      const items = joinDataServer();
      callback(null, { items });
    } catch (err) {
      callback(err);
    }
  },

  FilterData(call, callback) {
    try {
      const { filters, items } = call.request || {};
      const source = items && items.length ? items : joinDataServer();
      const filtered = applyFilters(source, filters || []);
      callback(null, { items: filtered });
    } catch (err) {
      callback(err);
    }
  },

  ExportData(call, callback) {
    try {
      const { format, items, rootName } = call.request;
      if (format === 1) {
        // XML
        const builder = new XMLBuilder({ ignoreAttributes: false });
        const xml = builder.build({
          [rootName || "filtrirani-rezultati"]: { item: items },
        });
        const filename = "filtrirano.generated.xml";
        callback(null, { content: Buffer.from(xml, "utf8"), filename });
      } else {
        // JSON
        const json = JSON.stringify(items, null, 2);
        const filename = "filtrirano.generated.json";
        callback(null, { content: Buffer.from(json, "utf8"), filename });
      }
    } catch (err) {
      callback(err);
    }
  },

  async StreamAttractions(call) {
    const citySlug = call.request?.citySlug || "berlin-germany";
    try {
      const dataDir = path.join(__dirname, "../..", "data");
      const cityFile = path.join(dataDir, `attractions.${citySlug}.json`);
      const filePath = fs.existsSync(cityFile)
        ? cityFile
        : path.join(dataDir, "attractions.json");
      let list = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
          else if (parsed && Array.isArray(parsed.attractions))
            list = parsed.attractions;
        } catch {}
      }
      if (!list.length) {
        list = Array.from({ length: 10 }).map((_, i) => ({
          name: `Attraction ${i + 1} - ${citySlug}`,
          description: `Demo stream item ${i + 1} for ${citySlug}`,
          url: "",
        }));
      }
      for (let i = 0; i < list.length; i++) {
        const a = list[i] || {};
        call.write({
          name: a.name || "",
          description: a.description || "",
          url: a.url || "",
        });
        await new Promise((r) => setTimeout(r, 150));
      }
      call.end();
    } catch (err) {
      try {
        call.destroy && call.destroy(err);
      } catch {}
    }
  },
};

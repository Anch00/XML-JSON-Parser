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

function readDocWithMeta(filename) {
  const items = parseXmlItemsFromData(filename);
  // derive doc name hint from filename (stem) and top-level element name if possible
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
  return { filename, stem, items };
}

function detectJoins(docs) {
  // heuristic: source fields that include 'id' may reference target's 'id'
  // prefer when source field name contains target stem
  const joins = [];
  for (const src of docs) {
    for (const tgt of docs) {
      if (src === tgt) continue;
      // collect candidate id-like fields from src
      const fields = new Set();
      (src.items || []).forEach((it) => {
        Object.keys(it || {}).forEach((k) => {
          if (/id/i.test(k)) fields.add(k);
        });
      });
      for (const f of fields) {
        const fLower = f.toLowerCase();
        const hitsTarget = fLower.includes(tgt.stem) || fLower.includes(tgt.stem.replace(/s$/, ""));
        if (hitsTarget) {
          joins.push({ source: src, target: tgt, sourceField: f, targetField: "id", alias: tgt.stem });
        }
      }
    }
  }
  return joins;
}

function genericJoinSelectedFiles(selectedFiles) {
  const docs = selectedFiles.map((f) => readDocWithMeta(f));
  if (!docs.length) return [];
  // Prefer itinerary as base if present, else trips, else first
  let base = docs.find((d) => /itinerary/i.test(d.stem)) ||
             docs.find((d) => /trips?/i.test(d.stem)) ||
             docs[0];
  let result = (base.items || []).map((it) => ({ ...it }));
  const joins = detectJoins(docs);
  for (const j of joins) {
    const targetMap = new Map();
    (j.target.items || []).forEach((entity) => {
      const key = entity[j.targetField];
      if (key != null) targetMap.set(String(key), entity);
    });
    result = result.map((item) => {
      const joinKey = item[j.sourceField];
      if (joinKey != null && targetMap.has(String(joinKey))) {
        const targetEntity = targetMap.get(String(joinKey));
        const alias = (j.alias || j.target.stem).replace(/[^A-Za-z0-9_]/g, "_");
        const nameValue = targetEntity.naziv || targetEntity.name || null;
        return {
          ...item,
          [alias]: targetEntity,
          [`${alias}_id`]: targetEntity.id || null,
          ...(nameValue ? { [`${alias}_name`]: nameValue } : {}),
        };
      }
      return item;
    });
  }
  // Special handling: itinerary.stops[].attractionId -> attractions details
  const itineraryDoc = docs.find((d) => /itinerary/i.test(d.stem));
  const attractionsDoc = docs.find((d) => /attractions/i.test(d.stem));
  if (itineraryDoc && attractionsDoc) {
    const attrMap = new Map();
    (attractionsDoc.items || []).forEach((a) => {
      if (a && a.id != null) attrMap.set(String(a.id), a);
    });
    result = result.map((it) => {
      const stops = Array.isArray(it.stops?.stop)
        ? it.stops.stop
        : it.stops?.stop
        ? [it.stops.stop]
        : [];
      if (!stops.length) return it;
      const resolvedStops = stops.map((s) => {
        const aid = String(s.attractionId || s.attractionID || "");
        const a = attrMap.get(aid) || {};
        return {
          attractionId: aid,
          time: s.time || "",
          name: a.name || "",
          type: a.type || "",
          area: a.area || "",
          citySlug: a.citySlug || it.citySlug || "",
        };
      });
      return { ...it, stops: resolvedStops };
    });
  }
  return result;
}

function joinDataServer() {
  // New domain: trips + itinerary + attractions
  const trips = parseXmlItemsFromData("trips.xml");
  const itineraries = parseXmlItemsFromData("itinerary.xml");
  const attractions = parseXmlItemsFromData("attractions.xml");

  const byId = (arr) => {
    const m = new Map();
    for (const it of arr) m.set(String(it.id || it.ID || ""), it);
    return m;
  };

  const tripsById = byId(trips);
  const attrById = byId(attractions);

  const out = [];
  for (const it of itineraries) {
    const trip = tripsById.get(String(it.tripId || it.tripID || "")) || {};
    const citySlug = it.citySlug || trip.citySlug || "";
    const stops = Array.isArray(it.stops?.stop)
      ? it.stops.stop
      : it.stops?.stop
      ? [it.stops.stop]
      : [];

    const resolvedStops = stops.map((s) => {
      const aid = String(s.attractionId || s.attractionID || "");
      const a = attrById.get(aid) || {};
      return {
        attractionId: aid,
        time: s.time || "",
        name: a.name || "",
        type: a.type || "",
        area: a.area || "",
        citySlug: a.citySlug || citySlug,
      };
    });

    out.push({
      itineraryId: it.id || "",
      tripId: it.tripId || "",
      day: toNumber(it.day),
      citySlug,
      area: it.area || "",
      tripCity: trip.city || "",
      durationDays: toNumber(trip.durationDays),
      preferences: trip.preferences || {},
      stops: resolvedStops,
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
      const req = call.request || {};
      const selected = Array.isArray(req.selectedFiles)
        ? req.selectedFiles
        : [];
      let items;
      if (selected.length > 0) {
        items = genericJoinSelectedFiles(selected);
      } else {
        items = joinDataServer();
      }
      callback(null, { items: items.map((it) => ({ json: JSON.stringify(it) })) });
    } catch (err) {
      callback(err);
    }
  },

  FilterData(call, callback) {
    try {
      const { filters, items } = call.request || {};
      const source = items && items.length
        ? items.map((x) => {
            try { return JSON.parse(x.json || "{}"); } catch { return {}; }
          })
        : joinDataServer();
      const filtered = applyFilters(source, filters || []);
      callback(null, { items: filtered.map((it) => ({ json: JSON.stringify(it) })) });
    } catch (err) {
      callback(err);
    }
  },

  ExportData(call, callback) {
    try {
      const { format, items, rootName } = call.request;
      const plainItems = (items || []).map((x) => {
        try { return JSON.parse(x.json || "{}"); } catch { return {}; }
      });
      if (format === 1) {
        // XML
        const builder = new XMLBuilder({ ignoreAttributes: false });
        const xml = builder.build({
          [rootName || "filtrirani-rezultati"]: { item: plainItems },
        });
        const filename = "filtrirano.generated.xml";
        callback(null, { content: Buffer.from(xml, "utf8"), filename });
      } else {
        // JSON
        const json = JSON.stringify(plainItems, null, 2);
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
